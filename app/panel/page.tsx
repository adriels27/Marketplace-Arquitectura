import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { BuyerReviewForm } from "@/components/buyer-review-form";
import { PublicationLink } from "@/components/publication-link";
import { getActivePublishingRestriction } from "@/lib/moderation";
import { SellerPaymentReview } from "@/components/seller-payment-review";
import { SiteHeader } from "@/components/site-header";
import { fromDatabaseProduct, type DatabaseProduct } from "@/lib/listings";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

function paymentStatus(status: string) {
  if (status === "verified_by_seller") return { label: "Pago aprobado por vendedor", tone: "status-published" };
  if (status === "verified_demo") return { label: "Pago de demostración", tone: "status-draft" };
  if (status === "proof_submitted") return { label: "Por revisar", tone: "status-draft" };
  if (status === "rejected_by_seller") return { label: "Comprobante rechazado", tone: "status-archived" };
  if (status === "cancelled") return { label: "Pedido cancelado", tone: "status-archived" };
  return { label: "Pedido creado · falta comprobante", tone: "status-draft" };
}

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/acceder");
  await redirectSuperadminFromMarketplace(supabase);

  const [profileResult, productsResult, purchasesResult, salesResult, exploreResult, reviewsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", claims.sub).maybeSingle(),
    supabase.from("products").select("id, title, price_cents, status, moderation_status, created_at").eq("seller_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, seller_id, reference, amount_cents, status, created_at, products(title)").eq("buyer_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, reference, amount_cents, status, proof_path, created_at, products(title)").eq("seller_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("products").select("id, title, description, price_cents, category, item_condition, location, product_images(storage_path, position)").eq("status", "published").neq("seller_id", claims.sub).or(`moderation_status.eq.active,and(moderation_status.eq.suspended,suspended_until.lte.${new Date().toISOString()})`).order("created_at", { ascending: false }).limit(4),
    supabase.from("seller_reviews").select("order_id").eq("buyer_id", claims.sub),
  ]);
  const [warningsResult, restrictionResult] = await Promise.all([
    supabase.from("moderation_warnings").select("id, reason, product_title, strike_number, created_at").eq("user_id", claims.sub).order("created_at", { ascending: false }).limit(10),
    supabase.from("moderation_warnings").select("strike_number, created_at").eq("user_id", claims.sub).eq("strike_number", 2).order("created_at", { ascending: false }).limit(1),
  ]);
  if (warningsResult.error) throw warningsResult.error;
  if (restrictionResult.error) throw restrictionResult.error;
  const publishingRestrictionUntil = getActivePublishingRestriction(restrictionResult.data ?? []);
  const strikeCount = Math.min(3, (warningsResult.data ?? []).filter((warning) => warning.strike_number !== null).length);
  const profile = profileResult.data;
  const products = productsResult.data ?? [];
  const published = products.filter((product) => product.status === "published" && product.moderation_status !== "deleted");
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
        <div className="dashboard-heading"><div><p className="eyebrow">Tu espacio</p><h1>Hola, {name}</h1><p>Administra tus compras, ventas y publicaciones.</p>{profile?.role === "admin" && <Link className="admin-link" href="/administracion/usuarios">Ver usuarios registrados →</Link>}{(profile?.role === "admin" || profile?.role === "moderator") && <Link className="admin-link" href="/moderacion">Abrir centro de moderación →</Link>}</div><div className="dashboard-actions"><Link className="text-link" href="/perfil/editar">Editar perfil</Link><Link className="text-link" href={`/vendedores/${claims.sub}`}>Mi perfil público</Link><Link className="text-link" href="/favoritos">Favoritos</Link><Link className="text-link" href="/mensajes">Mensajes</Link><Link className="text-link" href="/cuenta-bancaria">Datos bancarios</Link><PublicationLink blockedUntil={publishingRestrictionUntil?.toISOString() ?? null} initialNow={new Date().toISOString()} className="button">+ Publicar producto</PublicationLink></div></div>
        <section className="stat-grid">
          <article><span>Publicaciones activas</span><strong>{published.length}</strong><p>Productos visibles en el catálogo</p></article>
          <article><span>Borradores</span><strong>{drafts.length}</strong><p>Publicaciones pendientes de publicar</p></article>
          <article><span>Tipo de cuenta</span><strong className="role-stat">{profile?.role === "admin" ? "Superadministrador" : profile?.role === "moderator" ? "Moderador" : "Usuario"}</strong><p>Compra y vende desde una sola cuenta</p></article>
        </section>
        {profile?.role === "user" && <section aria-label={`Estado de strikes: ${strikeCount} de 3`} className="strike-status"><div><p className="eyebrow">Estado de la cuenta</p><h2>Strikes por publicaciones eliminadas</h2><p>Llevas <strong>{strikeCount} de 3</strong>. Al tercer strike, la cuenta será baneada permanentemente.</p></div><ol className="strike-indicators">{[1, 2, 3].map((strike) => <li aria-current={strike === strikeCount ? "step" : undefined} className={strike <= strikeCount ? "strike-indicator strike-indicator-active" : "strike-indicator"} key={strike}><span>{strike}</span><small>{strike === 1 ? "Advertencia" : strike === 2 ? "Bloqueo 30 días" : "Baneo"}</small></li>)}</ol></section>}
        {warningsResult.data?.length ? <section className="moderation-section user-warnings"><div className="section-heading"><div><p className="eyebrow">Cuenta</p><h2>Avisos de moderación</h2></div></div>{warningsResult.data.map((warning) => <article className="moderation-item warning-notice" key={warning.id}><div><strong>{warning.strike_number === 1 ? "Primer strike · Advertencia" : warning.strike_number === 2 ? "Segundo strike · Restricción de publicación" : warning.product_title ? "Advertencia de moderación" : "Aviso de moderación"}</strong>{warning.strike_number === 1 && warning.product_title ? <><p>Has infringido las políticas de uso de este sistema. Un moderador retiró esta publicación. Evita nuevas infracciones para conservar el acceso a las funciones de tu cuenta.</p><p><strong>Artículo retirado:</strong> {warning.product_title}</p><p><strong>Motivo:</strong> {warning.reason}</p></> : warning.strike_number === 2 ? <><p>Has vuelto a infringir las políticas de nuestro sistema. Se ha deshabilitado la opción de publicar productos durante 30 días. Si esta situación vuelve a ocurrir, tu cuenta será baneada permanentemente.</p><p><strong>Artículo retirado:</strong> {warning.product_title ?? "Publicación"}</p><p><strong>Motivo:</strong> {warning.reason}</p>{publishingRestrictionUntil && warning.created_at === restrictionResult.data?.[0]?.created_at && <p>Podrás volver a publicar el {new Intl.DateTimeFormat("es-EC", { dateStyle: "long" }).format(publishingRestrictionUntil)}.</p>}</> : warning.product_title ? <><p>Una publicación de tu cuenta fue retirada por infringir las políticas de uso.</p><p><strong>Artículo retirado:</strong> {warning.product_title}</p><p><strong>Motivo:</strong> {warning.reason}</p></> : <p>{warning.reason}</p>}<small>{new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(warning.created_at))}</small></div></article>)}</section> : null}
        <section className="dashboard-list"><div className="section-heading"><div><p className="eyebrow">Tus publicaciones</p><h2>{products.length ? "Gestiona tus productos" : "Aún no has publicado productos"}</h2></div><PublicationLink blockedUntil={publishingRestrictionUntil?.toISOString() ?? null} initialNow={new Date().toISOString()} className="text-link">Nueva publicación <span>→</span></PublicationLink></div>{products.length ? <div className="listing-list">{products.map((product) => { const isDeletedByModeration = product.moderation_status === "deleted"; return <article className={`order-card${isDeletedByModeration ? " order-card-deleted" : ""}`} key={product.id}>{isDeletedByModeration && <p className="deleted-product-notice">Publicación eliminada por infringir las normas</p>}<div className="small-product mint">▣</div><div><Link href={`/productos/${product.id}`}><strong>{product.title}</strong></Link><p>{formatPrice(product.price_cents)}</p></div><span className={`status ${isDeletedByModeration ? "status-archived" : `status-${product.status}`}`}>{isDeletedByModeration ? "Eliminada" : product.status === "published" ? "Publicado" : product.status === "draft" ? "Borrador" : product.status === "sold" ? "Vendido" : "Archivado"}</span>{!isDeletedByModeration && <Link className="edit-link" href={`/publicar/${product.id}/editar`}>Editar</Link>}</article>; })}</div> : <p className="empty-state">Tu primer producto aparecerá aquí cuando lo publiques.</p>}</section>
        <section className="dashboard-list orders-section"><div className="section-heading"><div><p className="eyebrow">Tus compras</p><h2>{purchases.length ? "Pedidos realizados" : "Aún no has comprado productos"}</h2></div></div>{purchases.length ? <div className="listing-list">{purchases.map((order) => { const state = paymentStatus(order.status); return <article className="order-card purchase-card-row" key={order.id}><div className="small-product lilac">$</div><div><strong>{(order.products as { title?: string } | null)?.title ?? "Producto"}</strong><p>{order.reference} · {formatPrice(order.amount_cents)}</p></div><span className={`status ${state.tone}`}>{state.label}</span>{order.status === "verified_by_seller" && !reviewedOrders.has(order.id) && <BuyerReviewForm orderId={order.id} />}{order.status === "verified_by_seller" && reviewedOrders.has(order.id) && <span className="review-sent">Calificación enviada</span>}</article>; })}</div> : <p className="empty-state">Cuando realices una compra, aparecerá aquí.</p>}</section>
        <section className="dashboard-list orders-section"><div className="section-heading"><div><p className="eyebrow">Tus ventas</p><h2>{sales.length ? "Ventas de tus publicaciones" : "Aún no tienes ventas"}</h2></div></div>{sales.length ? <div className="listing-list">{sales.map((order) => { const state = paymentStatus(order.status); return <article className="order-card sale-card" key={order.id}><div className="small-product mint">$</div><div><strong>{(order.products as { title?: string } | null)?.title ?? "Producto"}</strong><p>{order.reference} · {formatPrice(order.amount_cents)}</p></div><span className={`status ${state.tone}`}>{state.label}</span><SellerPaymentReview orderId={order.id} proofPath={order.proof_path} status={order.status} /></article>; })}</div> : <p className="empty-state">Los pedidos de tus publicaciones aparecerán aquí.</p>}</section>
        <section className="explore-from-panel"><div className="section-heading"><div><p className="eyebrow">También te puede interesar</p><h2>Productos de otros vendedores</h2></div><Link className="text-link" href="/#explorar">Ver catálogo <span>→</span></Link></div>{productsToExplore.length ? <div className="product-grid">{productsToExplore.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="empty-state">Cuando otros usuarios publiquen productos, los verás aquí.</p>}</section>
      </main>
    </>
  );
}
