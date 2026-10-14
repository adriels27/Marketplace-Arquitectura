import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { MessagesAutoRefresh } from "@/components/messages-auto-refresh";
import { publicImageUrl } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

type Conversation = { id: string; product_id: string; buyer_id: string; seller_id: string; updated_at: string };
type Context = { product_id: string; product_title: string; peer_name: string; peer_avatar_url: string | null };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/acceder");
  const { data: conversations } = await supabase.from("conversations").select("id, product_id, buyer_id, seller_id, updated_at").order("updated_at", { ascending: false });
  const items = await Promise.all(((conversations ?? []) as Conversation[]).map(async (conversation) => {
    const [{ data: contextData }, { data: messageData }, { data: imageData }] = await Promise.all([
      supabase.rpc("get_conversation_context", { p_conversation_id: conversation.id }),
      supabase.from("messages").select("body, sender_id").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("product_images").select("storage_path").eq("product_id", conversation.product_id).order("position", { ascending: true }).limit(1).maybeSingle(),
    ]);
    const context = (Array.isArray(contextData) ? contextData[0] : contextData) as Context | null;
    const isNewInterest = conversation.seller_id === userId && (!messageData || messageData.sender_id === conversation.buyer_id);
    return context ? { conversation, context, preview: messageData?.body ?? "Quiere información sobre tu publicación", isNewInterest, productImageUrl: publicImageUrl(imageData?.storage_path) } : null;
  }));
  const visible = items.filter((item): item is NonNullable<typeof item> => item !== null);
  const newInterestCount = visible.filter((item) => item.isNewInterest).length;
  return <><SiteHeader /><MessagesAutoRefresh /><main className="dashboard messages-page"><Link className="back-link" href="/panel">← Volver a mi espacio</Link><div className="section-heading"><div><p className="eyebrow">Contacto directo</p><h1>Mensajes</h1></div></div>{newInterestCount > 0 && <p className="interest-notice" role="status">Tienes {newInterestCount} {newInterestCount === 1 ? "persona interesada" : "personas interesadas"} en tus publicaciones.</p>}{visible.length ? <div className="conversation-list">{visible.map(({ conversation, context, preview, isNewInterest, productImageUrl }) => <Link className="conversation-row" href={`/mensajes/${conversation.id}`} key={conversation.id}><span aria-label={`Publicación: ${context.product_title}`} className="conversation-thumbnail" role="img" style={productImageUrl ? { backgroundImage: `url("${productImageUrl}")` } : undefined}>{!productImageUrl && <span aria-hidden="true">▣</span>}<span aria-label={context.peer_name} className="avatar conversation-peer-avatar" style={context.peer_avatar_url ? { backgroundImage: `url("${context.peer_avatar_url}")` } : undefined}>{!context.peer_avatar_url && context.peer_name[0]}</span></span><div><strong>{context.peer_name}</strong><p>{context.product_title}</p><small>{preview}</small></div>{isNewInterest && <span className="interest-badge">Nuevo interés</span>}<time>{new Intl.DateTimeFormat("es-EC", { dateStyle: "short" }).format(new Date(conversation.updated_at))}</time></Link>)}</div> : <p className="empty-state">Aún no tienes conversaciones. Abre un producto y selecciona “Contactar al vendedor”.</p>}</main></>;
}
