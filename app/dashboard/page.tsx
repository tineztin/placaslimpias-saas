import { redirect } from "next/navigation";
import { getOwnSubscriber } from "@/lib/subscribers";
import StepTabs from "./step-tabs";
import SettingsForm from "./settings/settings-form";
import LivePreview from "./live-preview";
import CopySnippet from "./copy-snippet";
import DeleteAccount from "./delete-account";
import { createCheckoutSession, createPortalSession } from "./actions";

export default async function DashboardHome() {
  const subscriber = await getOwnSubscriber();
  if (!subscriber) redirect("/dashboard/onboarding");

  // <iframe> literal (no un <div>+<script> que lo crea por detrás): así se
  // ve exactamente qué se está pegando. El pequeño <script> de al lado solo
  // ajusta la altura, escuchando el mismo postMessage que ya emite
  // calculadora.html.
  const snippet = `<iframe id="solarcalc-frame" src="https://calculadorasolar.net/embed?key=${subscriber.api_key}" style="width:100%;height:560px;border:0;display:block" title="Calculadora Solar"></iframe>
<script>
window.addEventListener("message", function (e) {
  var f = document.getElementById("solarcalc-frame");
  if (!f || e.source !== f.contentWindow) return;
  var d = e.data;
  if (!d || d.source !== "solarcalc" || d.type !== "height") return;
  f.style.height = Math.min(4000, Math.max(400, Math.round(d.height))) + "px";
});
</script>`;

  const periodEndLabel = subscriber.current_period_end
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(subscriber.current_period_end),
      )
    : null;

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
    <div className="space-y-6">
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
          Configura tu marca, comprueba cómo queda y pega el código en tu web. Funciona en
          cualquier sitio: WordPress, Webflow, Shopify o HTML a mano.
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
        <div className="space-y-3">
          {subscriber.cancel_at_period_end && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Has cancelado tu suscripción. Tu calculadora sigue funcionando con normalidad
              {periodEndLabel ? ` hasta el ${periodEndLabel}` : " hasta el final del periodo ya pagado"}.
              Puedes reactivarla en cualquier momento desde el portal de facturación.
            </div>
          )}
          {subscriber.stripe_customer_id && (
            <form action={createPortalSession}>
              <button type="submit" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Gestionar suscripción y facturas →
              </button>
            </form>
          )}
        </div>
      )}

      {subscriber.notification_emails.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No tienes ningún email de aviso configurado: tus leads se están guardando con normalidad,
          pero no te llega ningún correo cuando entra uno nuevo. Añade al menos uno en el paso 1,
          &quot;Configura tu marca&quot;.
        </div>
      )}

      <StepTabs
        stepConfigure={
          <div>
            <p className="text-sm text-slate-500">
              Logo, color, dónde recibir avisos y qué dominios pueden mostrarla.
            </p>
            <SettingsForm subscriber={subscriber} />
          </div>
        }
        stepPreview={
          <div>
            <p className="text-sm text-slate-500">
              Iframe real, exactamente lo que verán tus clientes. Si acabas de guardar cambios en
              el paso 1, cambia de pestaña y vuelve para verlos aquí.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <LivePreview apiKey={subscriber.api_key} />
            </div>
            <a
              href={`/embed?key=${subscriber.api_key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Abrir en pestaña nueva →
            </a>
            {(!subscriber.allowed_domains || subscriber.allowed_domains.length === 0) && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Aún no has añadido ningún dominio autorizado en el paso 1. Tu calculadora solo se
                mostrará en calculadorasolar.net hasta que lo hagas.
              </div>
            )}
          </div>
        }
        stepCode={
          <div>
            <p className="text-sm text-slate-500">
              Pega esto en tu web, donde quieras que aparezca la calculadora.
            </p>
            <div className="mt-4">
              <CopySnippet snippet={snippet} />
            </div>
          </div>
        }
      />

      <DeleteAccount />
    </div>
  );
}
