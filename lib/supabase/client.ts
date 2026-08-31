import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para Client Components. Usa la clave pública (anon):
// nunca importar aquí la service role key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
