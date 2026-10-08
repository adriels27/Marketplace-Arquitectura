import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

type Conversation = { id: string; product_id: string; updated_at: string };
type Context = { product_id: string; product_title: string; peer_name: string; peer_avatar_url: string | null };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/acceder");
  const { data: conversations } = await supabase.from("conversations").select("id, product_id, updated_at").order("updated_at", { ascending: false });
  const items = await Promise.all(((conversations ?? []) as Conversation[]).map(async (conversation) => {
    const { data: contextData } = await supabase.rpc("get_conversation_context", { p_conversation_id: conversation.id });
    const context = (Array.isArray(contextData) ? contextData[0] : contextData) as Context | null;
    const { data: messageData } = await supabase.from("messages").select("body, created_at").eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return context ? { conversation, context, preview: messageData?.body ?? "Sin mensajes todavía" } : null;
  }));
  const visible = items.filter((item): item is NonNullable<typeof item> => item !== null);
  return <><SiteHeader /><main className="dashboard messages-page"><Link className="back-link" href="/panel">← Volver a mi espacio</Link><div className="section-heading"><div><p className="eyebrow">Contacto directo</p><h1>Mensajes</h1></div></div>{visible.length ? <div className="conversation-list">{visible.map(({ conversation, context, preview }) => <Link className="conversation-row" href={`/mensajes/${conversation.id}`} key={conversation.id}><span className="avatar" style={context.peer_avatar_url ? { backgroundImage: `url("${context.peer_avatar_url}")` } : undefined}>{!context.peer_avatar_url && context.peer_name[0]}</span><div><strong>{context.peer_name}</strong><p>{context.product_title}</p><small>{preview}</small></div><time>{new Intl.DateTimeFormat("es-EC", { dateStyle: "short" }).format(new Date(conversation.updated_at))}</time></Link>)}</div> : <p className="empty-state">Aún no tienes conversaciones. Abre un producto y selecciona “Contactar al vendedor”.</p>}</main></>;
}
