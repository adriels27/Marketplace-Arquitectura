export function SiteFooter() {
  return (
    <footer className="site-footer" translate="no">
      <div className="site-footer-content">
        <p className="site-footer-institution">UNIVERSIDAD LAICA ELOY ALFARO DE MANABÍ (ULEAM)</p>
        <dl className="site-footer-details">
          <div><dt>CARRERA</dt><dd>Ingeniería en Software – 5.º Nivel</dd></div>
          <div><dt>PARALELO</dt><dd>B</dd></div>
          <div><dt>ASIGNATURA</dt><dd>Arquitectura de Software</dd></div>
          <div><dt>TEMA</dt><dd>Buenas prácticas en la documentación de software</dd></div>
        </dl>
        <section className="site-footer-authors" aria-labelledby="site-footer-authors-title">
          <p className="site-footer-label" id="site-footer-authors-title">AUTORES</p>
          <ul className="site-footer-team">
            <li>Jordan Josué Solórzano Zambrano</li>
            <li>Kevin Josué Corral Zambrano</li>
            <li>Adriel Elías Sánchez Zaldumbide</li>
            <li>José Gabriel Álava Barcia</li>
          </ul>
        </section>
        <div className="site-footer-meta">
          <p className="site-footer-line"><strong>DOCENTE:</strong> Carlos Eduardo Anchundia Betancourt</p>
          <p className="site-footer-line"><strong>PERÍODO ACADÉMICO:</strong> 2026-2</p>
          <p className="site-footer-location">MANTA – MANABÍ – ECUADOR</p>
        </div>
      </div>
    </footer>
  );
}
