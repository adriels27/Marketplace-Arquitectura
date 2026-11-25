import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const isPasswordRecovery = requestUrl.searchParams.get("next") === "/restablecer-contrasena";
  const failurePath = isPasswordRecovery ? "/recuperar-contrasena" : "/acceder";
  const failure = new URL(failurePath + "?error=enlace", requestUrl.origin);

  if (!code) return NextResponse.redirect(failure);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) return NextResponse.redirect(failure);

  if (isPasswordRecovery) {
    return NextResponse.redirect(new URL("/restablecer-contrasena", requestUrl.origin));
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return NextResponse.redirect(new URL(profile?.role === "admin" ? "/administracion/usuarios" : "/panel", requestUrl.origin));
}
