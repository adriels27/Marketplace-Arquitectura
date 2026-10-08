import Link from "next/link";
import type { Listing } from "@/lib/listings";
import { FavoriteButton } from "@/components/favorite-button";

export function ProductCard({ product }: { product: Listing }) {
  return (
    <article className="product-card">
      <FavoriteButton productId={product.id} />
      <Link className="product-card-link" href={product.href}>
      <div className={`product-visual ${product.tone} ${product.imageUrl ? "with-image" : ""}`} aria-hidden="true" style={product.imageUrl ? { backgroundImage: `url("${product.imageUrl}")` } : undefined}>
        {!product.imageUrl && <span>{product.icon}</span>}
      </div>
      <div className="product-copy">
        <div className="product-meta"><span>{product.category}</span><span>{product.location}</span></div>
        <h3>{product.name}</h3>
        <p className="product-price">{product.price}</p>
        <p className="product-seller">Vendido por {product.seller}</p>
      </div>
      </Link>
    </article>
  );
}
