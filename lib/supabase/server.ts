import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase para Server Components, Server Actions y Route
// Handlers: lee/escribe la sesión del usuario a través de las cookies de la
// petición. Sigue usando la clave pública (anon) + RLS, no la service role.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll puede lanzar si se llama desde un Server Component sin
            // middleware que refresque la sesión. Es seguro ignorarlo si las
            // sesiones se refrescan en middleware.ts (se añadirá junto con
            // el dashboard/auth en una fase posterior).
          }
        },
      },
    },
  );
}
