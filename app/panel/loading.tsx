export default function PanelLoading() {
  return (
    <main aria-busy="true" aria-label="Cargando tus publicaciones" className="dashboard">
      <p className="eyebrow">Tu espacio</p>
      <h1>Cargando tus publicaciones…</h1>
      <section className="dashboard-list" id="publicaciones">
        <div className="section-heading">
          <div><p className="eyebrow">Mis publicaciones</p><h2>Gestionar mis publicaciones</h2></div>
        </div>
        <p className="empty-state">Estamos cargando tus anuncios y sus imágenes.</p>
      </section>
    </main>
  );
}
