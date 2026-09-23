"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = { id: string; reference: string; amount_cents: number; seller_id: string; status: "pending_transfer" | "proof_submitted" | "verified_by_seller" | "rejected_by_seller" | "verified_demo" | "cancelled" };
type SellerBankDetails = { bank_name: string; account_number: string; account_email: string; national_id: string };

function formatPrice(cents: number) { return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(cents / 100); }

export function DemoPaymentForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [sellerDetails, setSellerDetails] = useState<SellerBankDetails | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function createOrder() {
    setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_marketplace_order", { p_product_id: productId });
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as Order | null;
      if (!result) throw new Error("No se pudo crear el pedido.");
      const { data: details, error: detailsError } = await supabase.from("seller_bank_details").select("bank_name, account_number, account_email, national_id").eq("seller_id", result.seller_id).single();
      if (detailsError || !details) throw new Error("El vendedor debe registrar primero sus datos bancarios desde su panel.");
      setSellerDetails(details);
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
      const { error: verificationError } = await supabase.rpc("submit_payment_proof", { p_order_id: order.id, p_proof_path: path });
      if (verificationError) { await supabase.storage.from("payment-proofs").remove([path]); throw verificationError; }
      setOrder({ ...order, status: "proof_submitted" }); setMessage("Comprobante enviado. El vendedor lo revisará desde su panel."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo subir el comprobante."); }
    finally { setLoading(false); }
  }
  if (!order) return <><button className="button full-button" disabled={loading} onClick={createOrder} type="button">{loading ? "Preparando pago..." : "Comprar este producto"}</button>{message && <p className="form-message" role="status">{message}</p>}</>;
  if (order.status === "verified_by_seller") return <div className="payment-success"><strong>✓ Pago aprobado</strong><p>El vendedor confirmó que el comprobante es válido.</p></div>;
  if (order.status === "proof_submitted") return <div className="payment-pending"><strong>Comprobante enviado</strong><p>El vendedor revisará tu pago y recibirás el resultado en tu panel.</p>{message && <p className="form-message" role="status">{message}</p>}</div>;
  if (!sellerDetails) return <p className="form-message">No se pudieron cargar los datos del vendedor. Vuelve a intentarlo.</p>;
  return <section className="payment-card"><p className="eyebrow">Transferencia al vendedor</p><h2>Datos para tu pago</h2><p className="payment-card-copy">Transfiere el valor exacto directamente al vendedor y luego sube tu comprobante.</p><dl className="payment-details"><div><dt>Banco</dt><dd>{sellerDetails.bank_name}</dd></div><div><dt>Cuenta</dt><dd>{sellerDetails.account_number}</dd></div><div><dt>Correo</dt><dd>{sellerDetails.account_email}</dd></div><div><dt>Cédula</dt><dd>{sellerDetails.national_id}</dd></div><div><dt>Referencia</dt><dd className="payment-reference">{order.reference}</dd></div><div><dt>Valor exacto</dt><dd>{formatPrice(order.amount_cents)}</dd></div></dl><form className="payment-proof-form" onSubmit={submitProof}><label>Comprobante de transferencia<input accept="image/jpeg,image/png,image/webp" name="proof" required type="file" /></label><p>El vendedor revisará el comprobante antes de aprobar el pago.</p><button className="button full-button" disabled={loading} type="submit">{loading ? "Enviando..." : "Enviar comprobante"}</button></form>{message && <p className="form-message" role="status">{message}</p>}</section>;
}
