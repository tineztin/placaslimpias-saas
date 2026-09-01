"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // El enlace del email trae el token de recuperación en el fragmento de
    // la URL; el SDK de Supabase lo procesa solo y dispara este evento con
    // una sesión temporal válida únicamente para cambiar la contraseña.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Si la pestaña ya procesó el enlace antes de que este listener se
    // registrara, comprobamos también si ya hay sesión.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

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

        {!ready && !done && (
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
