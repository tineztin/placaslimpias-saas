import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Única vía por la que subscription_status pasa a "active": los
// suscriptores no pueden escribir esa columna directamente (RLS de solo
// lectura, ver 0001_init.sql), así que esto es lo único que la mueve fuera
// de una migración manual.
//
// Requiere el body sin parsear para verificar la firma — nunca usar
// req.json() aquí antes de constructEvent.
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Firma de webhook de Stripe inválida:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  async function updateByCustomer(
    customerId: string,
    fields: {
      subscription_status: "active" | "past_due" | "canceled";
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
    },
  ) {
    const { error } = await admin.from("subscribers").update(fields).eq("stripe_customer_id", customerId);
    if (error) console.error("No se pudo actualizar el estado de la suscripción:", error);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriberId = session.metadata?.subscriber_id || session.client_reference_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (subscriberId && customerId) {
        const { error } = await admin
          .from("subscribers")
          .update({ stripe_customer_id: customerId })
          .eq("id", subscriberId);
        if (error) console.error("No se pudo guardar stripe_customer_id:", error);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      // current_period_end vive en el subscription item (no en el nivel
      // superior de Subscription en esta versión de la API); solo tenemos
      // un item por suscripción (un único precio, cantidad 1).
      const periodEndUnix = subscription.items.data[0]?.current_period_end;
      await updateByCustomer(customerId, {
        subscription_status: mapStripeStatus(subscription.status),
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      // Ya cancelada de verdad: cancel_at_period_end deja de tener sentido
      // como "aviso pendiente", así que se limpia junto con el estado.
      await updateByCustomer(customerId, {
        subscription_status: "canceled",
        cancel_at_period_end: false,
      });
      break;
    }

    default:
      break; // eventos que no nos interesan (ping de Stripe, otros objetos)
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  return "canceled"; // canceled, incomplete_expired, paused
}
