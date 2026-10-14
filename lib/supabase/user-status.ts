import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function setSupabaseUserEnabled(admin: SupabaseClient, userId: string, enabled: boolean) {
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: enabled ? "none" : "876000h" });
  if (error) return error.message;

  const { error: profileError } = await admin.from("profiles").update({
    disabled_at: enabled ? null : new Date().toISOString(),
  }).eq("id", userId);
  if (profileError) return `El estado de Auth cambió, pero no se pudo sincronizar el perfil: ${profileError.message}`;

  return null;
}
