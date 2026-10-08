export default function Loading() {
  return (
    <main className="access-page">
      <div className="access-card" aria-live="polite" aria-busy="true">
        <p className="eyebrow">Cargando</p>
        <h1>Un segundo...</h1>
        <p>Estamos preparando el contenido para ti.</p>
      </div>
    </main>
  );
}
