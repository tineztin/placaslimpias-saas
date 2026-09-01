import "server-only";
import Stripe from "stripe";

let _stripe: Stripe | null = null;

// Instancia perezosa: así el build no falla si STRIPE_SECRET_KEY todavía
// no está configurada (igual que Resend/Upstash), solo fallará si de verdad
// se llega a usar sin la clave.
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Falta STRIPE_SECRET_KEY.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
