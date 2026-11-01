"use client";

import { useState } from "react";

export function ShareProductButton({ productName }: { productName: string }) {
  const [message, setMessage] = useState("");

  async function shareProduct() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: productName, text: `Mira este producto: ${productName}`, url });
        setMessage("Producto compartido.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setMessage("Enlace copiado. Ya puedes compartirlo.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("No se pudo compartir. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="share-product-action">
      <button className="button full-button share-button" type="button" onClick={shareProduct}>
        Compartir producto
      </button>
      <span className="share-feedback" aria-live="polite">{message}</span>
    </div>
  );
}
