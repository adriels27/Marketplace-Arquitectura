"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function StartConversationButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/acceder"); setLoading(false); return; }
    const { data, error: rpcError } = await supabase.rpc("start_product_conversation", { p_product_id: productId });
    if (rpcError) { setError(rpcError.message); setLoading(false); return; }
    router.push(`/mensajes/${data}`);
  }
  return <div className="contact-action"><button className="button full-button button-secondary" disabled={loading} onClick={start} type="button">{loading ? "Abriendo conversación…" : "Contactar al vendedor"}</button>{error && <p className="form-message" role="status">{error}</p>}</div>;
}
