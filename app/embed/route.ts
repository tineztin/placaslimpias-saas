import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSubscriberByKey, frameAncestorsHeader } from "@/lib/subscribers";

// Cada visita puede llevar a un suscriptor distinto: no cachear la ruta.
export const dynamic = "force-dynamic";

const JSPDF_TAG =
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// JSON dentro de un <script>: escapar "<" evita que un valor con
// "</script>" (p. ej. un company_name malicioso) cierre el tag antes de
// tiempo y permita inyectar HTML/JS arbitrario.
function safeInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function messagePage(title: string, message: string, accent = "#0066B2") {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
    background:#F8FAFB;color:#0E1620;padding:24px;box-sizing:border-box;text-align:center}
  .card{max-width:360px}
  h1{font-size:16px;margin:0 0 8px;color:${accent}}
  p{margin:0;color:#33414F;font-size:14px}
</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></div></body></html>`;
}

function htmlResponse(body: string, status: number, csp?: string) {
  const headers: Record<string, string> = { "Content-Type": "text/html; charset=utf-8" };
  if (csp) headers["Content-Security-Policy"] = csp;
  return new Response(body, { status, headers });
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  const subscriber = await getSubscriberByKey(key);

  if (!subscriber) {
    return htmlResponse(
      messagePage("Calculadora no encontrada", "Este enlace de calculadora no es válido."),
      404,
    );
  }

  const csp = frameAncestorsHeader(subscriber.allowed_domains);

  if (subscriber.subscription_status !== "active") {
    return htmlResponse(
      messagePage(
        "Calculadora no disponible",
        `La cuenta de ${subscriber.company_name} está suspendida temporalmente.`,
        subscriber.brand_color,
      ),
      403,
      csp,
    );
  }

  const templatePath = path.join(process.cwd(), "public", "calculadora.html");
  const template = await fs.readFile(templatePath, "utf8");

  const config = {
    key: subscriber.api_key,
    brand: subscriber.company_name,
    accent: subscriber.brand_color,
    logo: subscriber.logo_url || "",
    privacy: subscriber.privacy_policy_url || "",
  };
  const configTag = `<script>window.__SOLARCALC_CONFIG__ = ${safeInlineJson(config)};</script>\n`;

  if (!template.includes(JSPDF_TAG)) {
    // El HTML base cambió y perdió el ancla de inserción: mejor fallar
    // claro que servir una calculadora sin marca ni endpoint de leads.
    return htmlResponse(
      messagePage("Calculadora no disponible", "Ha ocurrido un error inesperado. Inténtalo más tarde."),
      500,
    );
  }

  const html = template.replace(JSPDF_TAG, configTag + JSPDF_TAG);

  return htmlResponse(html, 200, csp);
}
