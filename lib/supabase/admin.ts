import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la service role key: bypassa RLS por completo. Solo se usa
// desde Route Handlers (app/embed, app/api/v1/leads) para resolver un
// suscriptor por su api_key público y para insertar leads — nunca se
// importa desde código que se ejecute en el navegador.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
