"use client";
import "./adyen-checkout.css";
import "@adyen/adyen-web/styles/adyen.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Session = { id: string; sessionData: string; clientKey: string; amount: { currency: string; value: number }; countryCode: string; orderId: string };

const BRAND_NAMES: Record<string, string> = { visa: "Visa", mc: "Mastercard", amex: "American Express", diners: "Diners Club", discover: "Discover", maestro: "Maestro", jcb: "JCB", cup: "UnionPay" };

// Se carga adyen-web solo en el navegador (usa window).
async function mountCard(
  container: HTMLElement,
  options: { session: Session; redirectResult?: string; onBrand: (brand: string | null) => void; onCompleted: (sessionResult: string) => void; onFailed: (message: string) => void },
) {
  const { AdyenCheckout, Card } = await import("@adyen/adyen-web");
  const { session } = options;
  const checkout = await AdyenCheckout({
    environment: "test",
    clientKey: session.clientKey,
    session: session.sessionData ? { id: session.id, sessionData: session.sessionData } : { id: session.id },
    amount: session.amount,
    countryCode: session.countryCode,
    locale: "es-ES",
    onPaymentCompleted: (result) => {
      const sessionResult = (result as { sessionResult?: string }).sessionResult;
      if (sessionResult) options.onCompleted(sessionResult); else options.onFailed("No se recibió el resultado del pago.");
    },
    onPaymentFailed: (result) => options.onFailed(`El pago fue rechazado${result?.resultCode ? ` (${result.resultCode})` : ""}. Revisa los datos o prueba con otra tarjeta.`),
    onError: (error) => options.onFailed(error.message || "Ocurrió un error con el pago."),
  });
  if (options.redirectResult) { checkout.submitDetails({ details: { redirectResult: options.redirectResult } }); return null; }
  return new Card(checkout, {
    hasHolderName: true,
    holderNameRequired: true,
    showBrandIcon: true,
    onBrand: (event) => options.onBrand(event.brand && event.brand !== "card" ? event.brand : null),
  }).mount(container);
}

export function AdyenCheckoutForm({ productId, resume }: { productId?: string; resume?: { session: Session; redirectResult: string } }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<Session | null>(resume?.session ?? null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const mounted = useRef(false);
  const lastBrand = useRef<string | null>(null);

  async function confirmPayment(current: Session, sessionResult: string) {
    const response = await fetch("/api/adyen/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: current.orderId, sessionId: current.id, sessionResult }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) { setMessage(payload.error ?? "No se pudo confirmar el pago."); return; }
    setPaid(true); router.refresh();
  }

  async function startPayment() {
    setLoading(true); setMessage(null);
    try {
      const { data, error } = await createClient().rpc("create_marketplace_order", { p_product_id: productId });
      if (error) throw error;
      const order = (Array.isArray(data) ? data[0] : data) as { id: string } | null;
      if (!order) throw new Error("No se pudo crear el pedido.");
      const response = await fetch("/api/adyen/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo preparar el pago.");
      setSession(payload as Session);
    } catch (error) { setMessage((error as { message?: string })?.message ?? "No se pudo preparar el pago."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!session || mounted.current || !containerRef.current) return;
    mounted.current = true;
    mountCard(containerRef.current, {
      session,
      redirectResult: resume?.redirectResult,
      onBrand: (value) => { lastBrand.current = value; setBrand(value); },
      onCompleted: (sessionResult) => { void confirmPayment(session, sessionResult); },
      onFailed: (text) => setMessage(text),
    }).catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo cargar el formulario de pago."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (paid) return <div className="payment-success"><strong>✓ Pago aprobado</strong><p>{lastBrand.current ? `Pagado con ${BRAND_NAMES[lastBrand.current] ?? lastBrand.current.toUpperCase()}. ` : ""}Tu compra ya está confirmada.</p><p><Link className="button" href="/panel">Ver mis compras</Link></p></div>;

  return (
    <div className="adyen-checkout">
      {!session && <button className="button full-button" disabled={loading} onClick={startPayment} type="button">{loading ? "Preparando pago..." : "Pagar con tarjeta"}</button>}
      {session && (
        <>
          {!resume && <p className="adyen-brand" aria-live="polite">{brand ? `💳 Tarjeta detectada: ${BRAND_NAMES[brand] ?? brand.toUpperCase()}` : "Ingresa el número de tu tarjeta (Visa, Mastercard, etc.)"}</p>}
          <div ref={containerRef} />
        </>
      )}
      {message && <p className="form-message" role="status">{message}</p>}
    </div>
  );
}
