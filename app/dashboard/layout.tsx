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
              <form action={signOutAction}>
                <button type="submit" className="text-slate-400 hover:text-slate-700">
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
