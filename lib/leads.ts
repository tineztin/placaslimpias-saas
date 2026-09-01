import "server-only";
import { createClient as createServerClient } from "./supabase/server";

export type Lead = {
  id: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string | null;
  calc_data: Record<string, unknown>;
  created_at: string;
};

// RLS hace todo el trabajo de alcance aquí: la política "subscriber can view
// own leads" (0001_init.sql) ya filtra por el suscriptor del usuario
// autenticado, así que un simple select sin where devuelve solo lo suyo.
export async function getOwnLeads(): Promise<Lead[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Lead[]) || [];
}
