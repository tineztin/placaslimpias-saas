"use client";

import { useActionState } from "react";
import { createSubscriber, type CreateSubscriberState } from "../actions";
import SubmitButton from "../submit-button";

export default function OnboardingForm() {
  const [state, formAction] = useActionState<CreateSubscriberState, FormData>(createSubscriber, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
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
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton
        pendingText="Creando…"
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Crear mi calculadora
      </SubmitButton>
    </form>
  );
}
