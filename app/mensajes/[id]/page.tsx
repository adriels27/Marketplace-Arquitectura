import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConversationChat } from "@/components/conversation-chat";
import { SiteHeader } from "@/components/site-header";
import { publicImageUrl } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

type Context = { product_id: string; product_title: string; peer_name: string; peer_avatar_url: string | null };
export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/acceder");
  const { data: conversation } = await supabase.from("conversations").select("id").eq("id", id).maybeSingle();
  if (!conversation) notFound();
  const { data } = await supabase.rpc("get_conversation_context", { p_conversation_id: id });
  const context = (Array.isArray(data) ? data[0] : data) as Context | null;
  if (!context) notFound();
  const [{ data: product }, { data: image }] = await Promise.all([
    supabase.from("products").select("price_cents").eq("id", context.product_id).maybeSingle(),
    supabase.from("product_images").select("storage_path").eq("product_id", context.product_id).order("position", { ascending: true }).limit(1).maybeSingle(),
  ]);
  const imageUrl = publicImageUrl(image?.storage_path);
  const price = product?.price_cents === undefined ? null : new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(product.price_cents / 100);
  return <><SiteHeader /><main className="dashboard messages-page"><Link className="back-link" href="/mensajes">← Todos los mensajes</Link><section className="conversation-heading"><span className="avatar" style={context.peer_avatar_url ? { backgroundImage: `url("${context.peer_avatar_url}")` } : undefined}>{!context.peer_avatar_url && context.peer_name[0]}</span><div><p className="eyebrow">Conversación con</p><h1>{context.peer_name}</h1></div></section><Link className="conversation-product-card" href={`/productos/${context.product_id}`}>
    {imageUrl ? <div aria-label={`Imagen de ${context.product_title}`} className="conversation-product-image" role="img" style={{ backgroundImage: `url("${imageUrl}")` }} /> : <div aria-hidden="true" className="conversation-product-image conversation-product-placeholder">▣</div>}
    <div className="conversation-product-copy"><p className="eyebrow">Publicación de interés</p><h2>{context.product_title}</h2>{price && <strong>{price}</strong>}</div>
  </Link><ConversationChat conversationId={id} userId={String(userId)} peerName={context.peer_name} /></main></>;
}
