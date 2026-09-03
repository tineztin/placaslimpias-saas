"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction, type DeleteAccountState } from "./actions";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteAccountState, FormData>(
    deleteAccountAction,
    {},
  );

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5">
      <h2 className="text-sm font-semibold text-red-900">Zona de peligro</h2>
      <p className="mt-1 text-sm text-red-800">
        Elimina tu cuenta, tu calculadora dejará de funcionar en tu web y borramos todos tus leads.
        Si tienes una suscripción activa, se cancela automáticamente. Esta acción no se puede
        deshacer.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Eliminar mi cuenta
        </button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <label className="block text-sm text-red-800" htmlFor="confirm">
            Escribe <strong>ELIMINAR</strong> para confirmar.
          </label>
          <input
            id="confirm"
            name="confirm"
            required
            autoComplete="off"
            className="w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pending ? "Eliminando…" : "Confirmar y eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
