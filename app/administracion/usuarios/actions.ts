"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) throw new Error("Debes iniciar sesión.");

  const { data: profile } = await supabase.from("profiles").select("role, deleted_at, disabled_at").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin" || profile.deleted_at || profile.disabled_at) throw new Error("No tienes permiso para administrar usuarios.");
  return { userId, admin: createAdminClient() };
}

function actionResult(kind: "notice" | "error", message: string): never {
  redirect(`/administracion/usuarios?${kind}=${encodeURIComponent(message)}`);
}

export async function createAdminUser(formData: FormData) {
  let admin;
  try {
    ({ admin } = await requireSuperadmin());
  } catch (error) {
    actionResult("error", error instanceof Error ? error.message : "No se pudo validar al Superadministrador.");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user");

  if (!email || !fullName || !birthDate || password.length < 8) {
    actionResult("error", "Completa todos los campos y usa una contraseña de al menos 8 caracteres.");
  }
  if (role !== "user" && role !== "moderator") {
    actionResult("error", "Rol inválido.");
  }

  const { data, error } = await admin!.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, birth_date: birthDate },
  });
  if (error) actionResult("error", error.message);

  if (role !== "user" && data?.user) {
    const { error: profileError } = await admin!.from("profiles").update({ role }).eq("id", data.user.id);
    if (profileError) {
      actionResult("error", `Usuario creado pero hubo un error asignando el rol: ${profileError.message}`);
    }
  }

  actionResult("notice", "Usuario creado.");
}

export async function setAdminUserEnabled(formData: FormData) {
  let context;
  try {
    context = await requireSuperadmin();
  } catch (error) {
    actionResult("error", error instanceof Error ? error.message : "No se pudo validar al Superadministrador.");
  }

  const userId = String(formData.get("userId") ?? "");
  const enabled = String(formData.get("enabled")) === "true";
  if (!userId || userId === context!.userId) actionResult("error", "No puedes cambiar el estado de tu propia cuenta.");

  const { error } = await context!.admin.auth.admin.updateUserById(userId, { ban_duration: enabled ? "none" : "876000h" });
  if (error) actionResult("error", error.message);
  const { error: profileError } = await context!.admin.from("profiles").update({
    disabled_at: enabled ? null : new Date().toISOString(),
  }).eq("id", userId);
  if (profileError) actionResult("error", `El estado de Auth cambió, pero no se pudo sincronizar el perfil: ${profileError.message}`);
  actionResult("notice", enabled ? "Cuenta habilitada." : "Cuenta deshabilitada.");
}

export async function deleteAdminUser(formData: FormData) {
  let context;
  try {
    context = await requireSuperadmin();
  } catch (error) {
    actionResult("error", error instanceof Error ? error.message : "No se pudo validar al Superadministrador.");
  }

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === context!.userId) actionResult("error", "No puedes eliminar tu propia cuenta.");

  const { error } = await context!.admin.auth.admin.deleteUser(userId, true);
  if (error) actionResult("error", error.message);
  const { error: profileError } = await context!.admin.from("profiles").update({
    email: `deleted+${userId}@deleted.invalid`,
    full_name: null,
    avatar_url: null,
    birth_date: null,
    role: "user",
    deleted_at: new Date().toISOString(),
  }).eq("id", userId);
  if (profileError) actionResult("error", `La cuenta quedó eliminada, pero no se pudo anonimizar el perfil: ${profileError.message}`);
  actionResult("notice", "Cuenta eliminada.");
}