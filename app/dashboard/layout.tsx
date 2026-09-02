import Link from "next/link";
import { getOwnSubscriber } from "@/lib/subscribers";
import { signOutAction } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const subscriber = await getOwnSubscriber();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-sm font-semibold text-slate-900">
            Calculadora <span className="text-blue-600">Solar</span>
          </Link>
          {subscriber && (
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                Instalación
              </Link>
              <Link href="/dashboard/leads" className="text-slate-600 hover:text-slate-900">
                Leads
              </Link>
              <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar sesión
                </button>
              </form>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
