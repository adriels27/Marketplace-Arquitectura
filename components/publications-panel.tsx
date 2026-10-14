"use client";

import { useRef } from "react";
import Link from "next/link";
import { PublicationLink } from "@/components/publication-link";

type Publication = {
  id: string;
  title: string;
  price_cents: number;
  status: string;
  moderation_status: string;
  imageUrl?: string;
};

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

function statusLabel(status: string) {
  if (status === "published") return "Publicado";
  if (status === "draft") return "Borrador";
  if (status === "sold") return "Vendido";
  return "Archivado";
}

export function PublicationsPanel({
  products,
  blockedUntil,
  initialNow,
}: {
  products: Publication[];
  blockedUntil: string | null;
  initialNow: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <section className="dashboard-list" id="publicaciones">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Mis publicaciones</p>
          <button
            aria-haspopup="dialog"
            className="publications-title-button"
            onClick={() => dialogRef.current?.showModal()}
            type="button"
          >
            Gestionar mis publicaciones
          </button>
        </div>
        <PublicationLink blockedUntil={blockedUntil} initialNow={initialNow} className="text-link">
          Nueva publicación <span>→</span>
        </PublicationLink>
      </div>

      <dialog aria-labelledby="publications-dialog-title" className="publications-dialog" ref={dialogRef}>
        <div className="publications-dialog-heading">
          <div>
            <p className="eyebrow">Mis publicaciones</p>
            <h2 id="publications-dialog-title">Tus anuncios</h2>
          </div>
          <button aria-label="Cerrar panel de publicaciones" className="publications-dialog-close" onClick={() => dialogRef.current?.close()} type="button">
            ×
          </button>
        </div>
        {products.length ? (
          <div className="listing-list publications-dialog-list">
            {products.map((product) => {
              const deleted = product.moderation_status === "deleted";
              return (
                <article className={`publication-card${deleted ? " publication-card-deleted" : ""}`} key={product.id}>
                  {deleted && <p className="deleted-product-notice">Publicación eliminada por infringir las normas</p>}
                  {product.imageUrl ? (
                    <div aria-label={`Imagen de ${product.title}`} className="publication-card-image listing-product-image" role="img" style={{ backgroundImage: `url("${product.imageUrl}")` }} />
                  ) : (
                    <div aria-hidden="true" className="publication-card-image publication-card-placeholder mint">▣</div>
                  )}
                  <div className="publication-card-copy">
                    <Link href={`/productos/${product.id}`} onClick={() => dialogRef.current?.close()}><strong>{product.title}</strong></Link>
                    <p>{formatPrice(product.price_cents)}</p>
                  </div>
                  <div className="publication-card-footer">
                    <span className={`status ${deleted ? "status-archived" : `status-${product.status}`}`}>
                      {deleted ? "Eliminada" : statusLabel(product.status)}
                    </span>
                    {!deleted && <Link className="edit-link" href={`/publicar/${product.id}/editar`} onClick={() => dialogRef.current?.close()}>Editar</Link>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">Aún no has publicado productos.</p>
        )}
      </dialog>
    </section>
  );
}
