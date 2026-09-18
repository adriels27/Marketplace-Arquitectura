"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = { id: string; reference: string; amount_cents: number; status: "pending_transfer" | "verified_demo" | "cancelled" };

function formatPrice(cents: number) { return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(cents / 100); }

export function DemoPaymentForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function createOrder() {
    setLoading(true); setMessage(null);
    try {
      const { data, error } = await createClient().rpc("create_marketplace_order", { p_product_id: productId });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as Order | null;
      if (!result) throw new Error("No se pudo crear el pedido.");
      setOrder(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo preparar el pago."); }
    finally { setLoading(false); }
  }
  async function submitProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!order) return;
    const candidate = new FormData(event.currentTarget).get("proof");
    const proof = candidate instanceof File && candidate.size > 0 ? candidate : null;
    if (!proof) { setMessage("Adjunta el comprobante para continuar."); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(proof.type) || proof.size > 5 * 1024 * 1024) { setMessage("El comprobante debe ser JPG, PNG o WebP y pesar máximo 5 MB."); return; }
    setLoading(true); setMessage(null);
    try {
      const supabase = createClient(); const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError; if (!userData.user) throw new Error("Tu sesión expiró. Ingresa nuevamente.");
      const extension = proof.type === "image/png" ? "png" : proof.type === "image/webp" ? "webp" : "jpg";
      const path = `${userData.user.id}/${order.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, proof, { contentType: proof.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: verificationError } = await supabase.rpc("submit_demo_payment_proof", { p_order_id: order.id, p_proof_path: path });
      if (verificationError) { await supabase.storage.from("payment-proofs").remove([path]); throw verificationError; }
      setOrder({ ...order, status: "verified_demo" }); setMessage("Pago confirmado en modo demostración. El pedido ya aparece en tu panel."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo subir el comprobante."); }
    finally { setLoading(false); }
  }
  if (!order) return <><button className="button full-button" disabled={loading} onClick={createOrder} type="button">{loading ? "Preparando pago..." : "Comprar este producto"}</button>{message && <p className="form-message" role="status">{message}</p>}</>;
  if (order.status === "verified_demo") return <div className="payment-success"><strong>✓ Pago confirmado</strong><p>Verificación simulada completada para la presentación.</p></div>;
  return <section className="payment-card"><p className="eyebrow">Transferencia · demostración</p><h2>Datos para tu pago</h2><p className="payment-card-copy">Transfiere el valor exacto y conserva el comprobante para completar la simulación.</p><dl className="payment-details"><div><dt>Banco</dt><dd>Banco Pichincha</dd></div><div><dt>Cuenta</dt><dd>Corriente · 2100 0000 0000</dd></div><div><dt>Titular</dt><dd>Marketplace Arqui (demo)</dd></div><div><dt>Referencia</dt><dd className="payment-reference">{order.reference}</dd></div><div><dt>Valor exacto</dt><dd>{formatPrice(order.amount_cents)}</dd></div></dl><form className="payment-proof-form" onSubmit={submitProof}><label>Comprobante de transferencia<input accept="image/jpeg,image/png,image/webp" name="proof" required type="file" /></label><p>Para esta demo, al subir una imagen válida se confirma el pago automáticamente. No se usa una cuenta bancaria real.</p><button className="button full-button" disabled={loading} type="submit">{loading ? "Verificando..." : "Subir y verificar pago"}</button></form>{message && <p className="form-message" role="status">{message}</p>}</section>;
}
