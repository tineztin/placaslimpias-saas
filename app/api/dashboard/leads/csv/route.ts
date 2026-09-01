import { getOwnLeads } from "@/lib/leads";

// RLS ya limita getOwnLeads() al suscriptor del usuario autenticado
// (cookies de sesión, no service role) — nada que verificar aquí aparte de
// que haya sesión, y si no la hay simplemente no habrá filas.
function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export async function GET() {
  const leads = await getOwnLeads();

  const header = [
    "Fecha",
    "Nombre",
    "Email",
    "Teléfono",
    "Municipio",
    "kWp",
    "Pérdida actual %",
    "kWh recuperables",
    "Valor anual €",
    "Coste limpiezas €",
    "Ahorro neto €",
  ];

  const rows = leads.map((lead) => {
    const c = lead.calc_data || {};
    return [
      lead.created_at,
      lead.lead_name,
      lead.lead_email,
      lead.lead_phone || "",
      c.municipio ?? "",
      c.kwp ?? "",
      c.perdidaActualPct ?? "",
      c.kwhRecuperables ?? "",
      c.valorAnualEur ?? "",
      c.costeLimpiezasEur ?? "",
      c.netoEur ?? "",
    ];
  });

  const csv =
    "﻿" + // BOM: para que Excel detecte UTF-8 y no rompa los acentos
    [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
