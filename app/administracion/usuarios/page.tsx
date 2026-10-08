import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin-header";
import { AdminUserActions } from "@/components/admin-user-actions";
import { CreateUserForm } from "./create-user-form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/acceder");

  const { data: profile } = await supabase.from("profiles").select("role, deleted_at, disabled_at").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin" || profile.deleted_at || profile.disabled_at) redirect("/acceder");

  type AdminProfile = { id: string; email: string; full_name: string | null; deleted_at: string | null; disabled_at: string | null; role: string };
  const profiles: AdminProfile[] = [];
  let configurationError: string | null = null;
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, deleted_at, disabled_at, role")
      .order("created_at", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error) {
      configurationError = error.message;
      break;
    }
    profiles.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const authUsers: Array<{ id: string; email?: string | null; banned_until?: string | null }> = [];
  try {
    const adminClient = createAdminClient();
    for (let page = 1; ; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        configurationError = error.message;
        break;
      }
      authUsers.push(...data.users);
      if (data.users.length < 1000) break;
    }
  } catch (error) {
    configurationError = error instanceof Error ? error.message : "No se pudieron consultar las cuentas.";
  }
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const users = authUsers.filter((authUser) => !profileById.get(authUser.id)?.deleted_at).map((authUser) => {
    const profile = profileById.get(authUser.id);
    const rawRole = profile?.role ?? "user";
    const roleMap: Record<string, string> = { admin: "Administrador", moderator: "Moderador", user: "Usuario" };
    return {
      id: authUser.id,
      email: authUser.email ?? profile?.email ?? "Sin correo",
      full_name: profile?.full_name ?? null,
      role: roleMap[rawRole] ?? rawRole,
      enabled: !authUser.banned_until && !profile?.disabled_at,
    };
  });
  const messages = await searchParams;

  return (
    <>
      <AdminHeader />
      <main className="admin-page">
        <section className="admin-heading">
          <p className="eyebrow">Administración</p>
          <h1>Usuarios</h1>
          <p>Gestiona el acceso a las cuentas del sistema.</p>
        </section>
        {messages.notice && <p className="form-message" role="status">{messages.notice}</p>}
        {(messages.error || configurationError) && <p className="form-message admin-error" role="alert">{messages.error ?? configurationError}</p>}
        <section className="admin-create-user">
          <h2>Crear usuario</h2>
          <CreateUserForm />
        </section>
        <section className="users-card">
          <div className="users-card-heading"><strong>{users.length} usuarios</strong><span>Ordenados del más reciente al más antiguo</span></div>
          <div className="users-table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th><th>Acciones</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.id}><td>{user.full_name || "Sin nombre"}</td><td>{user.email}</td><td>{user.role}</td><td>{user.enabled ? "Habilitada" : "Deshabilitada"}</td><td><AdminUserActions userId={user.id} email={user.email} enabled={user.enabled} isCurrentUser={user.id === userId} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
