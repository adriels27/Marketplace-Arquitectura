"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="access-page">
      <div className="access-card">
        <p className="eyebrow">Algo salió mal</p>
        <h1>No se pudo cargar esta vista.</h1>
        <p>Inténtalo de nuevo para continuar navegando por Marketplace Arqui.</p>
        <button className="button full-button" onClick={reset} type="button">
          Reintentar
        </button>
      </div>
    </main>
  );
}
