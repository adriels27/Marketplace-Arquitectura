import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportContentForm } from "@/components/report-content-form";
import { SiteHeader } from "@/components/site-header";
import { getProduct } from "@/lib/catalog";
import { fromDatabaseProduct, fromSampleProduct, type DatabaseProduct } from "@/lib/listings";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    await redirectSuperadminFromMarketplace(await createClient());
  }
  let product = getProduct(slug) ? fromSampleProduct(getProduct(slug)!) : null;
  let sellerId: string | null = null;
  let sellerProfile: { full_name: string; average_rating: number | string; review_count: number } | null = null;

  if (!product && uuidPattern.test(slug)) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("id, seller_id, title, description, price_cents, category, item_condition, location, product_images(storage_path, position)")
      .eq("id", slug)
      .maybeSingle();
    if (data) {
      product = fromDatabaseProduct(data as DatabaseProduct);
      sellerId = data.seller_id;
      const { data: sellerData } = await supabase.rpc("get_seller_profile", { p_seller_id: sellerId });
      sellerProfile = (Array.isArray(sellerData) ? sellerData[0] : sellerData) ?? null;
    }
  }

  if (!product) notFound();
  const isDatabaseProduct = uuidPattern.test(product.id);
  const sellerName = sellerProfile?.full_name || product.seller;
  const sellerRating = sellerProfile && sellerProfile.review_count ? `★ ${Number(sellerProfile.average_rating).toFixed(1)} · ${sellerProfile.review_count} calificación${sellerProfile.review_count === 1 ? "" : "es"}` : "Aún sin calificaciones";

  return (
    <>
      <SiteHeader />
      <main className="product-page">
        <Link className="back-link" href="/#explorar">← Volver a explorar</Link>
        <div className="product-detail-grid">
          <div className={`product-detail-visual ${product.tone} ${product.imageUrl ? "with-image" : ""}`} aria-hidden="true" style={product.imageUrl ? { backgroundImage: `url("${product.imageUrl}")` } : undefined}>{!product.imageUrl && <span>{product.icon}</span>}</div>
          <section className="product-details">
            <div className="product-meta"><span>{product.category}</span><span>{product.location}</span></div>
            <h1>{product.name}</h1>
            <p className="detail-price">{product.price}</p>
            <p className="condition">Estado: <strong>{product.condition}</strong></p>
            <p className="detail-description">{product.description}</p>
            {sellerId ? <Link className="seller-box seller-link" href={`/vendedores/${sellerId}`}><span className="avatar">{sellerName[0]}</span><div><strong>{sellerName}</strong><p>{sellerRating} · Ver perfil</p></div></Link> : <div className="seller-box"><span className="avatar">{sellerName[0]}</span><div><strong>{sellerName}</strong><p>Miembro de Marketplace Arqui</p></div></div>}
            <Link className="button full-button" href={isDatabaseProduct ? `/comprar/${product.id}` : "/acceder"}>Quiero comprar</Link>
            <p className="payment-hint">Transferirás directamente al vendedor. Él revisará el comprobante que envíes.</p>
            {isDatabaseProduct && <ReportContentForm targetId={product.id} targetType="product" />}
          </section>
        </div>
      </main>
    </>
  );
}
