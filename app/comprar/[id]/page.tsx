import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdyenCheckoutForm } from "@/components/adyen-checkout";
import { SiteHeader } from "@/components/site-header";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

function formatPrice(cents: number) { return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(cents / 100); }

export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/acceder");
  await redirectSuperadminFromMarketplace(supabase);
  const { data: product } = await supabase.from("products").select("id, title, price_cents, status").eq("id", id).maybeSingle();
  if (!product || product.status !== "published") notFound();
  return <><SiteHeader /><main className="purchase-page"><Link className="back-link" href={`/productos/${id}`}>← Volver al producto</Link><section className="purchase-card"><p className="eyebrow">Pago con tarjeta · Adyen</p><h1>Completa tu pedido</h1><div className="purchase-summary"><span>Producto</span><strong>{product.title}</strong><span>Total</span><strong>{formatPrice(product.price_cents)}</strong></div><AdyenCheckoutForm productId={product.id} /></section></main></>;
}
