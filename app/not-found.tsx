import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-blue-600">404</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">
          Puede que el enlace esté mal escrito o que la página ya no exista.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
