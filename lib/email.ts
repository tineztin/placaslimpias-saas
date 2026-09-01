import "server-only";
import { Resend } from "resend";

// Remitente verificado en Resend (requiere el dominio calculadorasolar.top
// verificado ahí con sus registros DNS; si no está verificado, Resend
// rechaza el envío).
const FROM = "Calculadora Solar <notificaciones@calculadorasolar.top>";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtEur = (v: unknown) => (typeof v === "number" ? eur.format(v) : "—");
const fmtNum = (v: unknown) => (typeof v === "number" ? String(v) : "—");

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

type LeadNotificationInput = {
  to: string[];
  companyName: string;
  lead: { nombre: string; email: string; tel?: string | null; municipio?: string };
  calc: Record<string, unknown>;
};

// Sin RESEND_API_KEY configurada, o sin destinatarios, no hace nada. El
// lead ya está guardado en Supabase antes de llegar aquí: un email que
// falla o que no está configurado todavía no debe impedir que el lead se
// haya capturado.
export async function sendLeadNotification({ to, companyName, lead, calc }: LeadNotificationInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || to.length === 0) return;

  const resend = new Resend(apiKey);

  const rows: [string, string][] = [
    ["Nombre", lead.nombre],
    ["Email", lead.email],
    ...(lead.tel ? ([["Teléfono", lead.tel]] as [string, string][]) : []),
    ["Municipio", String(calc.municipio ?? lead.municipio ?? "—")],
    ["Potencia", fmtNum(calc.kwp) + " kWp"],
    ["Pérdida actual estimada", fmtNum(calc.perdidaActualPct) + " %"],
    ["Ahorro neto anual estimado", fmtEur(calc.netoEur)],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6B7A89;font-size:13px">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;font-weight:600;color:#0E1620;font-size:13px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,Arial,sans-serif;max-width:480px;margin:0 auto">
      <h2 style="font-size:16px;color:#0E1620;margin:0 0 4px">Nuevo lead en tu calculadora</h2>
      <p style="font-size:13px;color:#6B7A89;margin:0 0 16px">${escapeHtml(companyName)}</p>
      <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
      <p style="font-size:12px;color:#8496A6;margin-top:20px">
        Este aviso lo envía automáticamente Calculadora Solar cuando alguien completa el cálculo en tu web.
      </p>
    </div>`;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Nuevo lead: ${lead.nombre} — ${companyName}`,
      html,
    });
  } catch (err) {
    console.error("No se pudo enviar el email de aviso del lead:", err);
  }
}
