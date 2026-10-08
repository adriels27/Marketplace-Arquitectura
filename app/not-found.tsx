import Link from "next/link";

export default function NotFound() {
  return (
    <main className="access-page">
      <div className="access-card">
        <p className="eyebrow">Página no disponible</p>
        <h1>¿Te perdiste?</h1>
        <p>La página que buscabas no existe o ya no está disponible en Marketplace Arqui.</p>
        <Link className="button full-button" href="/">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
