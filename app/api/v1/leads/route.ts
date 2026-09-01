import { NextRequest, NextResponse, after } from "next/server";
import { getSubscriberByKey } from "@/lib/subscribers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadNotification } from "@/lib/email";
import { checkLeadRateLimit } from "@/lib/ratelimit";

// Llamado por el propio iframe de /embed (misma-origen: calculadorasolar.top
// sirve tanto /embed como esta ruta), así que no hace falta CORS — añadir
// Access-Control-Allow-Origin aquí solo abriría la puerta a que cualquiera
// pudiera hacer POST directo con una key robada desde otro origen.
//
// El dominio de origen del embed no se puede verificar aquí (esta petición
// siempre llega desde calculadorasolar.top, nunca desde el sitio del
// suscriptor): esa comprobación ya la hizo el navegador vía la cabecera
// Content-Security-Policy: frame-ancestors que puso /embed.

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

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

  const withinLimit = await checkLeadRateLimit(key, clientIp(req));
  if (!withinLimit) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

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
    // leads no tiene columna propia para el municipio (no estaba en el
    // esquema original): se guarda dentro de calc_data, que ya es el cajón
    // flexible para todo lo relacionado con el cálculo.
    calc_data: { ...(body.calc || {}), municipio },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  // after(): se ejecuta tras enviar la respuesta al visitante, así el envío
  // del email (más lento, y no crítico) no le hace esperar. El lead ya está
  // guardado; si el email falla, sendLeadNotification lo registra y sigue.
  after(() =>
    sendLeadNotification({
      to: subscriber.notification_emails,
      companyName: subscriber.company_name,
      lead: { nombre, email, tel, municipio },
      calc: body.calc || {},
    }),
  );

  return NextResponse.json({ ok: true });
}
