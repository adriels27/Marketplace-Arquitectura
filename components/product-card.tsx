import Link from "next/link";
import type { Listing } from "@/lib/listings";

export function ProductCard({ product }: { product: Listing }) {
  return (
    <Link className="product-card" href={product.href}>
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
  );
}
