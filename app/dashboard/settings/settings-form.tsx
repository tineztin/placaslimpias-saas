"use client";

import { useActionState } from "react";
import Image from "next/image";
import type { Subscriber } from "@/lib/subscribers";
import { updateSubscriber, type SettingsState } from "../actions";

export default function SettingsForm({ subscriber }: { subscriber: Subscriber }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(updateSubscriber, {});

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <Field label="Nombre de la empresa" htmlFor="company_name">
        <input
          id="company_name"
          name="company_name"
          defaultValue={subscriber.company_name}
          required
          minLength={2}
          maxLength={120}
          className={inputClass}
        />
      </Field>

      <Field label="Color principal" htmlFor="brand_color" hint="Se usa en botones y acentos de la calculadora">
        <div className="flex items-center gap-3">
          <input
            type="color"
            id="brand_color"
            name="brand_color"
            defaultValue={subscriber.brand_color}
            className="h-10 w-14 cursor-pointer rounded border border-slate-300"
          />
        </div>
      </Field>

      <Field label="Logo" htmlFor="logo" hint="PNG o SVG, máx. 2 MB">
        <div className="flex items-center gap-4">
          {subscriber.logo_url && (
            <Image
              src={subscriber.logo_url}
              alt="Logo actual"
              width={80}
              height={40}
              unoptimized
              className="h-10 w-auto rounded border border-slate-200 bg-white object-contain p-1"
            />
          )}
          <input
            type="file"
            id="logo"
            name="logo"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
          />
        </div>
      </Field>

      <Field
        label="Emails de aviso"
        htmlFor="notification_emails"
        hint="Separados por coma. Aquí llegarán los nuevos leads."
      >
        <input
          id="notification_emails"
          name="notification_emails"
          defaultValue={subscriber.notification_emails?.join(", ")}
          placeholder="ventas@tuempresa.com, avisos@tuempresa.com"
          className={inputClass}
        />
      </Field>

      <Field
        label="Dominios autorizados"
        htmlFor="allowed_domains"
        hint="Separados por coma. Tu calculadora solo se cargará en estos dominios, p. ej. tuempresa.com"
      >
        <input
          id="allowed_domains"
          name="allowed_domains"
          defaultValue={subscriber.allowed_domains?.join(", ")}
          placeholder="tuempresa.com, www.tuempresa.com"
          className={inputClass}
        />
      </Field>

      <Field label="Política de privacidad (URL)" htmlFor="privacy_policy_url">
        <input
          type="url"
          id="privacy_policy_url"
          name="privacy_policy_url"
          defaultValue={subscriber.privacy_policy_url || ""}
          placeholder="https://tuempresa.com/privacidad"
          className={inputClass}
        />
      </Field>

      <Field label="Términos y condiciones (URL)" htmlFor="terms_url">
        <input
          type="url"
          id="terms_url"
          name="terms_url"
          defaultValue={subscriber.terms_url || ""}
          placeholder="https://tuempresa.com/terminos"
          className={inputClass}
        />
      </Field>

      <Field
        label="Redirección tras el cálculo (opcional)"
        htmlFor="redirect_url"
        hint="Calendly, WhatsApp… si lo dejas vacío se muestra el mensaje de éxito normal"
      >
        <input
          type="url"
          id="redirect_url"
          name="redirect_url"
          defaultValue={subscriber.redirect_url || ""}
          placeholder="https://calendly.com/tuempresa"
          className={inputClass}
        />
      </Field>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">Cambios guardados.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
