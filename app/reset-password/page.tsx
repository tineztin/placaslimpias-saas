"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linkError, setLinkError] = useState(searchParams.get("error") === "link_invalido");

  // La sesión de recuperación ya se estableció del lado del servidor en
  // /auth/confirm (ver ese route handler) antes de llegar aquí: al enlace
  // se le añaden nuestras propias cookies, así que solo hace falta leerla,
  // no volver a canjear ningún token.
  useEffect(() => {
    if (linkError) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setLinkError(true);
    });
  }, [linkError]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(traducirError(error.message));

    setDone(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Elige tu nueva contraseña</h1>
        <p className="mt-1 text-sm text-slate-500">Calculadora Solar — panel de suscriptor</p>

        {!ready && !done && linkError && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-red-600">
              Este enlace ya no es válido (puede haber caducado o usarse ya una vez).
            </p>
            <a
              href="/login"
              className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Pide un enlace nuevo →
            </a>
          </div>
        )}
        {!ready && !done && !linkError && (
          <p className="mt-6 text-sm text-slate-500">
            Abre esta página desde el enlace que te hemos enviado por email.
          </p>
        )}

        {ready && !done && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="password">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}

        {done && (
          <p className="mt-6 text-sm text-green-700">
            Contraseña actualizada. Entrando en tu panel…
          </p>
        )}
      </div>
    </main>
  );
}

function traducirError(msg: string): string {
  if (/password.*least/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres.";
  return msg;
}
