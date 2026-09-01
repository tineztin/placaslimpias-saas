import { redirect } from "next/navigation";
import { getOwnSubscriber } from "@/lib/subscribers";
import { getOwnLeads } from "@/lib/leads";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

export default async function LeadsPage() {
  const subscriber = await getOwnSubscriber();
  if (!subscriber) redirect("/dashboard/onboarding");

  const leads = await getOwnLeads();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            {leads.length} {leads.length === 1 ? "contacto capturado" : "contactos capturados"}
          </p>
        </div>
        {leads.length > 0 && (
          <a
            href="/api/dashboard/leads/csv"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exportar CSV
          </a>
        )}
      </div>

      {leads.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Todavía no has recibido ningún lead. En cuanto alguien complete la calculadora en tu web,
          aparecerá aquí.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Municipio</th>
                <th className="px-4 py-3 font-medium">kWp</th>
                <th className="px-4 py-3 font-medium">Ahorro neto/año</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const calc = lead.calc_data || {};
                return (
                  <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {dateFmt.format(new Date(lead.created_at))}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.lead_name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.lead_email}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.lead_phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{String(calc.municipio ?? "—")}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtNum(calc.kwp)}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtEur(calc.netoEur)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtNum(v: unknown): string {
  return typeof v === "number" ? v.toString() : "—";
}
function fmtEur(v: unknown): string {
  return typeof v === "number" ? eur.format(v) : "—";
}
