import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConversationChat } from "@/components/conversation-chat";
import { SiteHeader } from "@/components/site-header";
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
  return <><SiteHeader /><main className="dashboard messages-page"><Link className="back-link" href="/mensajes">← Todos los mensajes</Link><section className="conversation-heading"><span className="avatar" style={context.peer_avatar_url ? { backgroundImage: `url("${context.peer_avatar_url}")` } : undefined}>{!context.peer_avatar_url && context.peer_name[0]}</span><div><p className="eyebrow">Sobre el producto</p><h1>{context.peer_name}</h1><Link href={`/productos/${context.product_id}`}>{context.product_title}</Link></div></section><ConversationChat conversationId={id} userId={String(userId)} peerName={context.peer_name} /></main></>;
}
