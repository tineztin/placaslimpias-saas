import { redirect } from "next/navigation";
import { getOwnSubscriber } from "@/lib/subscribers";
import CopySnippet from "./copy-snippet";
import { createCheckoutSession, createPortalSession } from "./actions";

export default async function DashboardHome() {
  const subscriber = await getOwnSubscriber();
  if (!subscriber) redirect("/dashboard/onboarding");

  const snippet = `<div id="solar-calc" data-api-key="${subscriber.api_key}"></div>
<script src="https://calculadorasolar.top/widget.js" async></script>`;

  const statusLabel: Record<string, string> = {
    active: "Activa",
    past_due: "Pago pendiente",
    canceled: "Cancelada",
  };
  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    past_due: "bg-amber-100 text-amber-800",
    canceled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{subscriber.company_name}</h1>
          <span
            className={
              "rounded-full px-2.5 py-0.5 text-xs font-medium " +
              (statusColor[subscriber.subscription_status] || "bg-slate-100 text-slate-700")
            }
          >
            {statusLabel[subscriber.subscription_status] || subscriber.subscription_status}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Pega este código en tu web para mostrar la calculadora. Funciona en cualquier sitio:
          WordPress, Webflow, Shopify o HTML a mano.
        </p>
      </div>

      {subscriber.subscription_status !== "active" ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            Tu calculadora no se mostrará en tu web mientras la suscripción no esté activa. 9 € + IVA
            al mes, cancela cuando quieras.
          </p>
          <form action={createCheckoutSession}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Suscribirme
            </button>
          </form>
        </div>
      ) : (
        subscriber.stripe_customer_id && (
          <form action={createPortalSession}>
            <button type="submit" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Gestionar suscripción y facturas →
            </button>
          </form>
        )
      )}

      <CopySnippet snippet={snippet} />

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Previsualizar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Así se ve tu calculadora ahora mismo, con tu marca aplicada.
        </p>
        <a
          href={`/embed?key=${subscriber.api_key}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Abrir vista previa →
        </a>
      </div>

      {(!subscriber.allowed_domains || subscriber.allowed_domains.length === 0) && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Aún no has añadido ningún dominio autorizado en{" "}
          <a href="/dashboard/settings" className="font-medium text-blue-600 hover:text-blue-700">
            Configuración
          </a>
          . Tu calculadora solo se mostrará en calculadorasolar.top hasta que lo hagas.
        </div>
      )}
    </div>
  );
}
