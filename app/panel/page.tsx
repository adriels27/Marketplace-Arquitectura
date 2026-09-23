import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { BuyerReviewForm } from "@/components/buyer-review-form";
import { SellerPaymentReview } from "@/components/seller-payment-review";
import { SiteHeader } from "@/components/site-header";
import { fromDatabaseProduct, type DatabaseProduct } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

function paymentStatus(status: string) {
  if (status === "verified_by_seller" || status === "verified_demo") return { label: "Pago aprobado", tone: "status-published" };
  if (status === "proof_submitted") return { label: "Por revisar", tone: "status-draft" };
  if (status === "rejected_by_seller") return { label: "Comprobante rechazado", tone: "status-archived" };
  return { label: "Pendiente de comprobante", tone: "status-draft" };
}

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/acceder");

  const [profileResult, productsResult, purchasesResult, salesResult, exploreResult, reviewsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", claims.sub).maybeSingle(),
    supabase.from("products").select("id, title, price_cents, status, created_at").eq("seller_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, seller_id, reference, amount_cents, status, created_at, products(title)").eq("buyer_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, reference, amount_cents, status, proof_path, created_at, products(title)").eq("seller_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("products").select("id, title, description, price_cents, category, item_condition, location, product_images(storage_path, position)").eq("status", "published").neq("seller_id", claims.sub).order("created_at", { ascending: false }).limit(4),
    supabase.from("seller_reviews").select("order_id").eq("buyer_id", claims.sub),
  ]);
  const profile = profileResult.data;
  const products = productsResult.data ?? [];
  const published = products.filter((product) => product.status === "published");
  const drafts = products.filter((product) => product.status === "draft");
  const purchases = purchasesResult.data ?? [];
  const sales = salesResult.data ?? [];
  const reviewedOrders = new Set((reviewsResult.data ?? []).map((review) => review.order_id));
  const productsToExplore = ((exploreResult.data ?? []) as DatabaseProduct[]).map(fromDatabaseProduct);
  const name = profile?.full_name?.trim() || claims.email?.split("@")[0] || "usuario";

  return (
    <>
      <SiteHeader />
      <main className="dashboard">
        <div className="dashboard-heading"><div><p className="eyebrow">Tu espacio</p><h1>Hola, {name}</h1><p>Administra tus compras, ventas y publicaciones.</p>{profile?.role === "admin" && <Link className="admin-link" href="/administracion/usuarios">Ver usuarios registrados →</Link>}</div><div className="dashboard-actions"><Link className="text-link" href={`/vendedores/${claims.sub}`}>Mi perfil público</Link><Link className="text-link" href="/cuenta-bancaria">Datos bancarios</Link><Link className="button" href="/publicar">+ Publicar producto</Link></div></div>
        <section className="stat-grid">
          <article><span>Publicaciones activas</span><strong>{published.length}</strong><p>Productos visibles en el catálogo</p></article>
          <article><span>Borradores</span><strong>{drafts.length}</strong><p>Publicaciones pendientes de publicar</p></article>
          <article><span>Tipo de cuenta</span><strong className="role-stat">{profile?.role === "admin" ? "Administrador" : "Usuario"}</strong><p>Compra y vende desde una sola cuenta</p></article>
        </section>
        <section className="dashboard-list"><div className="section-heading"><div><p className="eyebrow">Tus publicaciones</p><h2>{products.length ? "Gestiona tus productos" : "Aún no has publicado productos"}</h2></div><Link className="text-link" href="/publicar">Nueva publicación <span>→</span></Link></div>{products.length ? <div className="listing-list">{products.map((product) => <article className="order-card" key={product.id}><div className="small-product mint">▣</div><div><Link href={`/productos/${product.id}`}><strong>{product.title}</strong></Link><p>{formatPrice(product.price_cents)}</p></div><span className={`status status-${product.status}`}>{product.status === "published" ? "Publicado" : product.status === "draft" ? "Borrador" : product.status === "sold" ? "Vendido" : "Archivado"}</span><Link className="edit-link" href={`/publicar/${product.id}/editar`}>Editar</Link></article>)}</div> : <p className="empty-state">Tu primer producto aparecerá aquí cuando lo publiques.</p>}</section>
        <section className="dashboard-list orders-section"><div className="section-heading"><div><p className="eyebrow">Tus compras</p><h2>{purchases.length ? "Pedidos realizados" : "Aún no has comprado productos"}</h2></div></div>{purchases.length ? <div className="listing-list">{purchases.map((order) => { const state = paymentStatus(order.status); return <article className="order-card purchase-card-row" key={order.id}><div className="small-product lilac">$</div><div><strong>{(order.products as { title?: string } | null)?.title ?? "Producto"}</strong><p>{order.reference} · {formatPrice(order.amount_cents)}</p></div><span className={`status ${state.tone}`}>{state.label}</span>{order.status === "verified_by_seller" && !reviewedOrders.has(order.id) && <BuyerReviewForm orderId={order.id} />}{order.status === "verified_by_seller" && reviewedOrders.has(order.id) && <span className="review-sent">Calificación enviada</span>}</article>; })}</div> : <p className="empty-state">Cuando realices una compra, aparecerá aquí.</p>}</section>
        <section className="dashboard-list orders-section"><div className="section-heading"><div><p className="eyebrow">Tus ventas</p><h2>{sales.length ? "Ventas de tus publicaciones" : "Aún no tienes ventas"}</h2></div></div>{sales.length ? <div className="listing-list">{sales.map((order) => { const state = paymentStatus(order.status); return <article className="order-card sale-card" key={order.id}><div className="small-product mint">$</div><div><strong>{(order.products as { title?: string } | null)?.title ?? "Producto"}</strong><p>{order.reference} · {formatPrice(order.amount_cents)}</p></div><span className={`status ${state.tone}`}>{state.label}</span><SellerPaymentReview orderId={order.id} proofPath={order.proof_path} status={order.status} /></article>; })}</div> : <p className="empty-state">Los pedidos de tus publicaciones aparecerán aquí.</p>}</section>
        <section className="explore-from-panel"><div className="section-heading"><div><p className="eyebrow">También te puede interesar</p><h2>Productos de otros vendedores</h2></div><Link className="text-link" href="/#explorar">Ver catálogo <span>→</span></Link></div>{productsToExplore.length ? <div className="product-grid">{productsToExplore.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="empty-state">Cuando otros usuarios publiquen productos, los verás aquí.</p>}</section>
      </main>
    </>
  );
}
