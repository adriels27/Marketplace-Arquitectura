import Link from "next/link";

export function AdminHeader() {
  return (
    <header className="site-header admin-header">
      <Link className="brand" href="/administracion/usuarios">
        <span className="brand-mark">M</span>
        <span>Administración</span>
      </Link>
      <nav aria-label="Administración">
        <Link href="/administracion/usuarios">Usuarios</Link>
      </nav>
    </header>
  );
}