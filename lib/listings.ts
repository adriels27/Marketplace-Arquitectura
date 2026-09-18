import type { Product as SampleProduct } from "@/lib/catalog";

export type Listing = {
  id: string;
  href: string;
  name: string;
  price: string;
  category: string;
  location: string;
  seller: string;
  condition: string;
  icon: string;
  tone: string;
  description: string;
  imageUrl?: string;
};

export type DatabaseProduct = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  category: string;
  item_condition: string;
  location: string;
  product_images?: Array<{ storage_path: string; position: number }>;
};

const categoryVisuals: Record<string, Pick<Listing, "icon" | "tone">> = {
  Hogar: { icon: "⌑", tone: "coral" },
  Tecnología: { icon: "▣", tone: "lilac" },
  Moda: { icon: "◒", tone: "sun" },
  Deportes: { icon: "◓", tone: "mint" },
  Libros: { icon: "▤", tone: "sun" },
  Otros: { icon: "◇", tone: "mint" },
};

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

export function publicImageUrl(path: string | undefined) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl || !path) return undefined;
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  return `${projectUrl}/storage/v1/object/public/product-images/${safePath}`;
}

export function fromDatabaseProduct(product: DatabaseProduct): Listing {
  const visual = categoryVisuals[product.category] ?? categoryVisuals.Otros;
  const firstImage = product.product_images?.sort((a, b) => a.position - b.position)[0];
  return {
    id: product.id,
    href: `/productos/${product.id}`,
    name: product.title,
    price: formatPrice(product.price_cents),
    category: product.category,
    location: product.location,
    seller: "Vendedor de Marketplace Arqui",
    condition: product.item_condition,
    description: product.description,
    imageUrl: publicImageUrl(firstImage?.storage_path),
    ...visual,
  };
}

export function fromSampleProduct(product: SampleProduct): Listing {
  return {
    id: product.slug,
    href: `/productos/${product.slug}`,
    name: product.name,
    price: product.price,
    category: product.category,
    location: product.location,
    seller: product.seller,
    condition: product.condition,
    icon: product.icon,
    tone: product.tone,
    description: product.description,
  };
}
