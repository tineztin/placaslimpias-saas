import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Verifica el enlace de los emails de Supabase Auth (confirmación de
// registro, restablecer contraseña...) del lado del servidor, con
// verifyOtp({ token_hash }) en vez de dejar que el cliente intente el
// intercambio PKCE (?code=). El PKCE exige que el mismo navegador que pidió
// el enlace sea el que lo abre (guarda un code_verifier local) — si el
// usuario lo abre en otro navegador/dispositivo, o si un escáner de
// seguridad del email lo visita antes, el código de un solo uso se quema y
// el enlace deja de servir aunque sea el correcto. token_hash no tiene ese
// problema: se valida por sí solo, sin nada guardado de antes en el
// navegador. Patrón recomendado por Supabase para Next.js App Router.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") || "/reset-password";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/reset-password?error=link_invalido`);
}
