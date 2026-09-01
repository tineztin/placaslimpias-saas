import { redirect } from "next/navigation";
import { getOwnSubscriber } from "@/lib/subscribers";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const subscriber = await getOwnSubscriber();
  if (!subscriber) redirect("/dashboard/onboarding");

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900">Configuración</h1>
      <p className="mt-1 text-sm text-slate-500">
        Personaliza cómo se ve tu calculadora y dónde recibes los avisos.
      </p>
      <SettingsForm subscriber={subscriber} />
    </div>
  );
}
