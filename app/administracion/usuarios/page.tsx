import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string | null) {
  if (!value) return "No registrada";
  const dateValue = value.includes("T") ? value : `${value}T00:00:00`;
  return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(dateValue));
}

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/acceder");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") redirect("/panel");

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, birth_date, created_at, role")
    .order("created_at", { ascending: false });

  return (
    <>
      <SiteHeader />
      <main className="admin-page">
        <Link className="back-link" href="/panel">← Volver a mi panel</Link>
        <section className="admin-heading">
          <p className="eyebrow">Administración</p>
          <h1>Usuarios registrados</h1>
          <p>Consulta las cuentas nuevas y sus datos de registro.</p>
        </section>
        <section className="users-card">
          <div className="users-card-heading"><strong>{users?.length ?? 0} usuarios</strong><span>Ordenados del más reciente al más antiguo</span></div>
          <div className="users-table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Correo</th><th>Fecha de nacimiento</th><th>Registro</th><th>Rol</th></tr></thead>
              <tbody>{users?.map((user) => <tr key={user.id}><td>{user.full_name || "Sin nombre"}</td><td>{user.email}</td><td>{formatDate(user.birth_date)}</td><td>{formatDate(user.created_at)}</td><td><span className={`status status-${user.role}`}>{user.role === "admin" ? "Administrador" : "Usuario"}</span></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
