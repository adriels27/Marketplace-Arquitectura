"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; body: string; created_at: string };
export function ConversationChat({ conversationId, userId, peerName }: { conversationId: string; userId: string; peerName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loadMessages = useCallback(async () => {
    const { data } = await createClient().from("messages").select("id, sender_id, body, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }, [conversationId]);
  useEffect(() => { void loadMessages(); const timer = window.setInterval(() => void loadMessages(), 4000); return () => window.clearInterval(timer); }, [loadMessages]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!body.trim()) return;
    setLoading(true); setError(null);
    const { error: sendError } = await createClient().rpc("send_conversation_message", { p_conversation_id: conversationId, p_body: body });
    if (sendError) setError(sendError.message); else { setBody(""); await loadMessages(); }
    setLoading(false);
  }
  return <section className="chat-panel"><div aria-live="polite" className="chat-messages">{messages.length ? messages.map((message) => <article className={`chat-message ${message.sender_id === userId ? "own-message" : ""}`} key={message.id}><span>{message.sender_id === userId ? "Tú" : peerName}</span><p>{message.body}</p><time>{new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.created_at))}</time></article>) : <p className="empty-state">Inicia la conversación con un mensaje.</p>}</div><form className="chat-form" onSubmit={send}><label className="sr-only" htmlFor="message-body">Escribe un mensaje</label><textarea id="message-body" maxLength={2000} onChange={(event) => setBody(event.target.value)} placeholder="Escribe un mensaje…" required rows={2} value={body} /><button className="button" disabled={loading || !body.trim()} type="submit">{loading ? "Enviando…" : "Enviar"}</button></form>{error && <p className="form-message" role="status">{error}</p>}<p className="form-help">Mantén los acuerdos y comprobantes de pago dentro de la plataforma.</p></section>;
}
