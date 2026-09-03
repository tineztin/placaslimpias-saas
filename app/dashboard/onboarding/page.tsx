import { redirect } from "next/navigation";
import { getOwnSubscriber } from "@/lib/subscribers";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const subscriber = await getOwnSubscriber();
  if (subscriber) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-slate-900">Bienvenido</h1>
      <p className="mt-1 text-sm text-slate-500">
        Un último paso antes de darte tu calculadora: ¿cómo se llama tu empresa? Es lo que verán
        tus clientes en la calculadora embebida.
      </p>

      <OnboardingForm />
    </div>
  );
}
