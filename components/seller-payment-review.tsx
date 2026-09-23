"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SellerPaymentReview({ orderId, proofPath, status }: { orderId: string; proofPath: string | null; status: string }) {
  const router = useRouter(); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function review(approved: boolean) {
    setLoading(true); setMessage(null);
    const { error } = await createClient().rpc("review_payment_proof", { p_order_id: orderId, p_is_approved: approved });
    setMessage(error ? error.message : approved ? "Pago aprobado." : "Comprobante rechazado. El comprador podrá enviar uno nuevo.");
    if (!error) router.refresh(); setLoading(false);
  }
  async function viewProof() {
    if (!proofPath) return;
    const { data, error } = await createClient().storage.from("payment-proofs").createSignedUrl(proofPath, 60);
    if (error || !data?.signedUrl) { setMessage(error?.message ?? "No se pudo abrir el comprobante."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  if (status !== "proof_submitted") return null;
  return <div className="review-actions"><button className="text-button" onClick={viewProof} type="button">Ver comprobante</button><button className="button button-small" disabled={loading} onClick={() => review(true)} type="button">Aprobar</button><button className="reject-button" disabled={loading} onClick={() => review(false)} type="button">Rechazar</button>{message && <p className="form-message" role="status">{message}</p>}</div>;
}
