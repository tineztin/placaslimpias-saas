import "server-only";
import { createAdminClient } from "./supabase/admin";
import { createClient as createServerClient } from "./supabase/server";

export type Subscriber = {
  id: string;
  api_key: string;
  company_name: string;
  brand_color: string;
  logo_url: string | null;
  privacy_policy_url: string | null;
  terms_url: string | null;
  notification_emails: string[];
  allowed_domains: string[];
  redirect_url: string | null;
  subscription_status: "active" | "canceled" | "past_due";
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

// Lectura del propio suscriptor: usa el cliente de sesión (respeta RLS,
// "auth.uid() = user_id") en vez de la service role — no hace falta más
// privilegio del necesario para que alguien vea su propia fila.
export async function getOwnSubscriber(): Promise<Subscriber | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("subscribers").select("*").maybeSingle();
  return (data as Subscriber) || null;
}

// api_key nunca es secreto (va en HTML público y en la URL del iframe), así
// que esta consulta corre con la service role key sin necesidad de sesión.
export async function getSubscriberByKey(key: string): Promise<Subscriber | null> {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscribers")
    .select(
      "id, api_key, company_name, brand_color, logo_url, privacy_policy_url, allowed_domains, notification_emails, subscription_status",
    )
    .eq("api_key", key)
    .maybeSingle();

  if (error || !data) return null;
  return data as Subscriber;
}

// El control de acceso real del iframe: el navegador que embebe la
// calculadora es quien hace cumplir frame-ancestors, y a diferencia de
// Referer no puede falsearlo la propia página embebedora. Siempre se
// permite 'self' para que nuestras propias páginas (demo.html, pruebas)
// puedan cargar /embed independientemente de lo que el suscriptor haya
// configurado todavía.
export function frameAncestorsHeader(allowedDomains: string[]): string {
  const origins = (allowedDomains || [])
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => (/^https?:\/\//.test(d) ? d : `https://${d}`));

  return `frame-ancestors 'self' ${origins.join(" ")}`.trim();
}
