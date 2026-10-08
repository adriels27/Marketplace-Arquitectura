import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function AdminHeader() {
  return (
    <header className="site-header admin-header">
      <Link className="brand" href="/administracion/usuarios">
        <span className="brand-mark">M</span>
        <span>Administración</span>
      </Link>
      <nav aria-label="Administración">
        <Link href="/administracion/usuarios">Usuarios</Link>
        <Link href="/moderacion">Moderación</Link>
        <LogoutButton />
      </nav>
    </header>
  );
}
