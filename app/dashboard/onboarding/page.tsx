import { redirect } from "next/navigation";
import { getOwnSubscriber } from "@/lib/subscribers";
import { createSubscriber } from "../actions";

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

      <form action={createSubscriber} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="company_name">
            Nombre de tu empresa
          </label>
          <input
            id="company_name"
            name="company_name"
            required
            minLength={2}
            maxLength={120}
            placeholder="SolarClean Barcelona"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Crear mi calculadora
        </button>
      </form>
    </div>
  );
}
