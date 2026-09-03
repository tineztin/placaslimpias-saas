"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import crypto from "node:crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { sendWelcomeEmail } from "@/lib/email";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") || "calculadorasolar.net";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function requireUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// Toda escritura en subscribers pasa por aquí (Server Action = siempre
// servidor) con la service role key. RLS solo da SELECT a authenticated a
// propósito — ver supabase/migrations/0001_init.sql — así que esta acción es
// la única vía de escritura, y por eso vuelve a comprobar explícitamente que
// la fila pertenece al usuario antes de tocarla.
export async function createSubscriber(formData: FormData) {
  const user = await requireUser();
  const companyName = String(formData.get("company_name") || "").trim().slice(0, 120);
  if (companyName.length < 2) {
    throw new Error("Indica el nombre de tu empresa.");
  }

  const admin = createAdminClient();
  const apiKey = "sk_live_" + crypto.randomBytes(24).toString("hex");

  const { error } = await admin.from("subscribers").insert({
    user_id: user.id,
    api_key: apiKey,
    company_name: companyName,
  });
  if (error) throw new Error("No se pudo crear tu cuenta: " + error.message);

  if (user.email) after(() => sendWelcomeEmail(user.email!, companyName));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export type SettingsState = { error?: string; ok?: boolean };

// Firma compatible con useActionState: nunca lanza, siempre devuelve el
// resultado para que el formulario muestre el error inline.
export async function updateSubscriber(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscribers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) return { error: "No se encontró tu cuenta." };

  const brandColor = String(formData.get("brand_color") || "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    return { error: "El color debe ser un hexadecimal válido, p. ej. #0066B2." };
  }

  const companyName = String(formData.get("company_name") || "").trim().slice(0, 120);
  if (companyName.length < 2) return { error: "Indica el nombre de tu empresa." };

  const notificationEmails = splitList(String(formData.get("notification_emails") || ""));
  const allowedDomains = splitList(String(formData.get("allowed_domains") || ""));
  const privacyUrl = String(formData.get("privacy_policy_url") || "").trim();
  const termsUrl = String(formData.get("terms_url") || "").trim();
  const redirectUrl = String(formData.get("redirect_url") || "").trim();

  const update: Record<string, unknown> = {
    company_name: companyName,
    brand_color: brandColor,
    notification_emails: notificationEmails,
    allowed_domains: allowedDomains,
    privacy_policy_url: privacyUrl || null,
    terms_url: termsUrl || null,
    redirect_url: redirectUrl || null,
  };

  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    if (logoFile.size > 2 * 1024 * 1024) return { error: "El logo no puede superar 2 MB." };
    const ext = (logoFile.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/logo.${ext || "png"}`;

    const { error: upErr } = await admin.storage
      .from("logos")
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type || undefined });
    if (upErr) {
      return {
        error:
          "No se pudo subir el logo (" + upErr.message + "). ¿Se aplicó la migración 0002_dashboard.sql?",
      };
    }
    const { data: pub } = admin.storage.from("logos").getPublicUrl(path);
    update.logo_url = pub.publicUrl + "?v=" + Date.now(); // evita caché al re-subir
  }

  const { error } = await admin.from("subscribers").update(update).eq("id", sub.id);
  if (error) {
    return {
      error: "No se pudo guardar (" + error.message + "). ¿Se aplicó la migración 0002_dashboard.sql?",
    };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Lleva al suscriptor al Checkout hospedado por Stripe. subscription_status
// se activa solo cuando llega el webhook (checkout.session.completed /
// customer.subscription.updated) — nunca lo escribe esta acción, para que
// no haya forma de "activarse" sin pasar de verdad por el pago.
export async function createCheckoutSession() {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscribers")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) redirect("/dashboard/onboarding");

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("Falta configurar STRIPE_PRICE_ID.");

  const baseUrl = await getBaseUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: sub.stripe_customer_id || undefined,
    customer_email: sub.stripe_customer_id ? undefined : user.email,
    client_reference_id: sub.id,
    metadata: { subscriber_id: sub.id },
    subscription_data: { metadata: { subscriber_id: sub.id } },
    // Managed Payments (el "merchant of record" de Stripe) viene activado
    // por defecto en cuentas nuevas y exige un código fiscal por producto;
    // lo desactivamos porque el precio ya es fijo (10,89 € con el IVA
    // incluido) y gestionamos los impuestos nosotros, no Stripe.
    managed_payments: { enabled: false },
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Stripe no devolvió una URL de checkout.");
  redirect(session.url);
}

// Portal de facturación hospedado por Stripe: cancelar, cambiar tarjeta,
// ver facturas. Requiere haber pasado antes por Checkout al menos una vez
// (para tener stripe_customer_id).
export async function createPortalSession() {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscribers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub?.stripe_customer_id) throw new Error("Todavía no tienes una suscripción de Stripe.");

  const baseUrl = await getBaseUrl();
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/dashboard`,
  });

  redirect(session.url);
}

export type DeleteAccountState = { error?: string };

// Baja definitiva de la cuenta (derecho de supresión del RGPD, ver
// política de privacidad). Antes de borrar nada cancela cualquier
// suscripción de Stripe activa: si eso fallara y borrásemos igualmente la
// cuenta, el cliente se quedaría sin panel para cancelarla él mismo pero
// Stripe le seguiría cobrando cada mes, así que se aborta la baja hasta
// que el cobro esté realmente cancelado. Los leads se borran en cascada
// por la foreign key subscriber_id (ver 0001_init.sql), no hace falta
// borrarlos aparte.
export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const user = await requireUser();

  if (String(formData.get("confirm") || "").trim().toUpperCase() !== "ELIMINAR") {
    return { error: 'Escribe "ELIMINAR" para confirmar.' };
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscribers")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (sub?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const subscriptions = await stripe.subscriptions.list({
        customer: sub.stripe_customer_id,
        status: "all",
      });
      for (const s of subscriptions.data) {
        if (s.status !== "canceled" && s.status !== "incomplete_expired") {
          await stripe.subscriptions.cancel(s.id);
        }
      }
    } catch (e) {
      return {
        error:
          "No se pudo cancelar tu suscripción de Stripe, así que no hemos borrado la cuenta para que no te sigan cobrando. Inténtalo de nuevo o escríbenos a hola@calculadorasolar.net. (" +
          (e instanceof Error ? e.message : String(e)) +
          ")",
      };
    }
  }

  if (sub) {
    const { error } = await admin.from("subscribers").delete().eq("id", sub.id);
    if (error) return { error: "No se pudo borrar tu cuenta: " + error.message };
  }

  await admin.auth.admin.deleteUser(user.id);

  const supabase = await createServerClient();
  await supabase.auth.signOut();

  redirect("/login?deleted=1");
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
