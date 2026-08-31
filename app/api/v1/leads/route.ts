import { NextRequest, NextResponse } from "next/server";
import { getSubscriberByKey } from "@/lib/subscribers";
import { createAdminClient } from "@/lib/supabase/admin";

// Llamado por el propio iframe de /embed (misma-origen: calculadorasolar.top
// sirve tanto /embed como esta ruta), así que no hace falta CORS — añadir
// Access-Control-Allow-Origin aquí solo abriría la puerta a que cualquiera
// pudiera hacer POST directo con una key robada desde otro origen.
//
// El dominio de origen del embed no se puede verificar aquí (esta petición
// siempre llega desde calculadorasolar.top, nunca desde el sitio del
// suscriptor): esa comprobación ya la hizo el navegador vía la cabecera
// Content-Security-Policy: frame-ancestors que puso /embed.
//
// Pendiente para una fase posterior: rate limiting por api_key/IP y envío
// de la notificación por email (Resend) — de momento el lead se guarda pero
// no se notifica todavía.

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;

type LeadPayload = {
  key?: string;
  lead?: {
    nombre?: string;
    email?: string;
    tel?: string;
    municipio?: string;
    marketing?: boolean;
  };
  calc?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const key = String(body.key || "");
  const subscriber = await getSubscriberByKey(key);
  if (!subscriber || subscriber.subscription_status !== "active") {
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 403 });
  }

  const lead = body.lead || {};
  const nombre = String(lead.nombre || "").trim().slice(0, 80);
  const email = String(lead.email || "").trim().toLowerCase().slice(0, 120);
  const tel = String(lead.tel || "").trim().slice(0, 20);
  const municipio = String(lead.municipio || "").trim().slice(0, 80);

  if (nombre.length < 2 || !EMAIL_RE.test(email) || municipio.length < 2) {
    return NextResponse.json({ ok: false, error: "invalid_lead" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").insert({
    subscriber_id: subscriber.id,
    lead_name: nombre,
    lead_email: email,
    lead_phone: tel || null,
    calc_data: body.calc || {},
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
