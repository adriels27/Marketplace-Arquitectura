import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/panel";
  const isPasswordRecovery = next === "/restablecer-contrasena";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (profile?.role === "admin" && !isPasswordRecovery) {
        return NextResponse.redirect(new URL("/administracion/usuarios", requestUrl.origin));
      }
    }
  }

  // Solo se permiten rutas internas para evitar redirecciones hacia sitios ajenos.
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/panel", requestUrl.origin));
}
