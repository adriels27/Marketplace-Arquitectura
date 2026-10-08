import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";
import { fromDatabaseProduct, type DatabaseProduct } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/acceder");
  const { data: rows, error } = await supabase.from("product_favorites").select("products(id, title, description, price_cents, category, item_condition, location, product_images(storage_path, position))").eq("user_id", userId).order("created_at", { ascending: false });
  const products = (rows ?? []).flatMap((row) => row.products ? [fromDatabaseProduct(row.products as unknown as DatabaseProduct)] : []);
  return <><SiteHeader /><main className="dashboard"><Link className="back-link" href="/panel">← Volver a mi espacio</Link><div className="section-heading"><div><p className="eyebrow">Tu colección</p><h1>Productos favoritos</h1></div></div>{error ? <p className="form-message" role="status">No se pudo cargar tu lista. Aplica la migración de funciones sociales en Supabase.</p> : products.length ? <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="empty-state">Todavía no guardaste productos. Usa el corazón en un anuncio para tenerlo a mano.</p>}</main></>;
}
