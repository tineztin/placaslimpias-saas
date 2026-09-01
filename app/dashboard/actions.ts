"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
