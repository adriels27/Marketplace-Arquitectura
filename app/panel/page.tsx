import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/acceder");

  const [profileResult, productsResult, purchasesResult, salesResult] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", claims.sub).maybeSingle(),
    supabase.from("products").select("id, title, price_cents, status, created_at").eq("seller_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, reference, amount_cents, status, created_at, products(title)").eq("buyer_id", claims.sub).order("created_at", { ascending: false }),
    supabase.from("orders").select("id, reference, amount_cents, status, created_at, products(title)").eq("seller_id", claims.sub).order("created_at", { ascending: false }),
  ]);
  const profile = profileResult.data;
  const products = productsResult.data ?? [];
  const published = products.filter((product) => product.status === "published");
  const drafts = products.filter((product) => product.status === "draft");
  const purchases = purchasesResult.data ?? [];
  const sales = salesResult.data ?? [];
  const name = profile?.full_name?.trim() || claims.email?.split("@")[0] || "usuario";

  return (
    <>
      <SiteHeader />
      <main className="dashboard">
        <div className="dashboard-heading"><div><p className="eyebrow">Tu espacio</p><h1>Hola, {name}</h1><p>Administra tus compras, ventas y publicaciones.</p>{profile?.role === "admin" && <Link className="admin-link" href="/administracion/usuarios">Ver usuarios registrados →</Link>}</div><Link className="button" href="/publicar">+ Publicar producto</Link></div>
        <section className="stat-grid">
          <article><span>Publicaciones activas</span><strong>{published.length}</strong><p>Productos visibles en el catálogo</p></article>
          <article><span>Borradores</span><strong>{drafts.length}</strong><p>Publicaciones pendientes de publicar</p></article>
          <article><span>Tipo de cuenta</span><strong className="role-stat">{profile?.role === "admin" ? "Administrador" : "Usuario"}</strong><p>Compra y vende desde una sola cuenta</p></article>
        </section>
        <section className="dashboard-list"><div className="section-heading"><div><p className="eyebrow">Tus publicaciones</p><h2>{products.length ? "Gestiona tus productos" : "Aún no has publicado productos"}</h2></div><Link className="text-link" href="/publicar">Nueva publicación <span>→</span></Link></div>{products.length ? <div className="listing-list">{products.map((product) => <article className="order-card" key={product.id}><div className="small-product mint">▣</div><div><Link href={`/productos/${product.id}`}><strong>{product.title}</strong></Link><p>{formatPrice(product.price_cents)}</p></div><span className={`status status-${product.status}`}>{product.status === "published" ? "Publicado" : product.status === "draft" ? "Borrador" : "Archivado"}</span><Link className="edit-link" href={`/publicar/${product.id}/editar`}>Editar</Link></article>)}</div> : <p className="empty-state">Tu primer producto aparecerá aquí cuando lo publiques.</p>}</section>
        <section className="dashboard-list orders-section"><div className="section-heading"><div><p className="eyebrow">Tus compras</p><h2>{purchases.length ? "Pedidos realizados" : "Aún no has comprado productos"}</h2></div></div>{purchases.length ? <div className="listing-list">{purchases.map((order) => <article className="order-card" key={order.id}><div className="small-product lilac">$</div><div><strong>{(order.products as { title?: string } | null)?.title ?? "Producto"}</strong><p>{order.reference} · {formatPrice(order.amount_cents)}</p></div><span className={`status ${order.status === "verified_demo" ? "status-published" : "status-draft"}`}>{order.status === "verified_demo" ? "Pago confirmado (demo)" : "Pendiente"}</span></article>)}</div> : <p className="empty-state">Cuando realices una compra, aparecerá aquí.</p>}</section>
        <section className="dashboard-list orders-section"><div className="section-heading"><div><p className="eyebrow">Tus ventas</p><h2>{sales.length ? "Ventas de tus publicaciones" : "Aún no tienes ventas"}</h2></div></div>{sales.length ? <div className="listing-list">{sales.map((order) => <article className="order-card" key={order.id}><div className="small-product mint">$</div><div><strong>{(order.products as { title?: string } | null)?.title ?? "Producto"}</strong><p>{order.reference} · {formatPrice(order.amount_cents)}</p></div><span className={`status ${order.status === "verified_demo" ? "status-published" : "status-draft"}`}>{order.status === "verified_demo" ? "Pago confirmado (demo)" : "Pendiente"}</span></article>)}</div> : <p className="empty-state">Los pedidos de tus publicaciones aparecerán aquí.</p>}</section>
      </main>
    </>
  );
}
