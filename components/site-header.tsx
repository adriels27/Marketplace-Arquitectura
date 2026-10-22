import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let isSignedIn = false;
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    isSignedIn = Boolean(claimsData?.claims?.sub);
  } catch {
    isSignedIn = false;
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">M</span>
        <span>Marketplace Arqui</span>
      </Link>
      <nav aria-label="Navegación principal">
        {isSignedIn ? (
          <>
            <Link href="/#explorar">Explorar</Link>
            <Link href="/panel#publicaciones">Mis publicaciones</Link>
            <Link href="/favoritos">Favoritos</Link>
            <Link href="/mensajes">Mensajes</Link>
            <LogoutButton className="button button-small" />
          </>
        ) : (
          <>
            <Link className="nav-register-link" href="/acceder?modo=registro">
              Registrarse
            </Link>
            <Link className="button button-small" href="/acceder">
              Iniciar sesión
            </Link>
          </>
        )}
        <ThemeToggle />
      </nav>
    </header>
  );
}
