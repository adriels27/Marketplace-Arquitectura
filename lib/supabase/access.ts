import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function redirectSuperadminFromMarketplace(supabase: SupabaseClient) {
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return;

  const { data: profile } = await supabase.from("profiles").select("role, deleted_at, disabled_at").eq("id", userId).maybeSingle();
  if (profile?.deleted_at || profile?.disabled_at) notFound();
  if (profile?.role === "admin") redirect("/administracion/usuarios");
}