import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(claimsData?.claims?.sub);

  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">M</span>
        <span>Marketplace Arqui</span>
      </Link>
      <nav aria-label="Navegación principal">
        <Link href="/#explorar">Explorar</Link>
        <Link href="/panel#publicaciones">Mis publicaciones</Link>
        <Link href="/favoritos">Favoritos</Link>
        <Link href="/mensajes">Mensajes</Link>
        {isSignedIn ? <LogoutButton className="button button-small" /> : <Link className="button button-small" href="/acceder">Ingresar</Link>}
        <ThemeToggle />
      </nav>
    </header>
  );
}
