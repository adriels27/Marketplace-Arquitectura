import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/">
        <span className="brand-mark">M</span>
        <span>Marketplace Arqui</span>
      </Link>
      <nav aria-label="Navegación principal">
        <Link href="/#explorar">Explorar</Link>
        <Link href="/panel">Mis publicaciones</Link>
        <Link className="button button-small" href="/acceder">Ingresar</Link>
      </nav>
    </header>
  );
}
