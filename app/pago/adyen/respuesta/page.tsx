import { redirect } from "next/navigation";
import { AdyenCheckoutForm } from "@/components/adyen-checkout";
import { SiteHeader } from "@/components/site-header";
import { getAdyenConfig, PAYMENT_COUNTRY, PAYMENT_CURRENCY } from "@/lib/adyen";
import { createClient } from "@/lib/supabase/server";

// returnUrl de Adyen: solo se usa cuando el banco redirige al cliente (p. ej. 3D Secure por redirección).
export default async function AdyenResponsePage({ searchParams }: { searchParams: Promise<{ orderId?: string; sessionId?: string; redirectResult?: string }> }) {
  const { orderId, sessionId, redirectResult } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/acceder");
  if (!orderId || !sessionId || !redirectResult) redirect("/panel");

  const { data: order } = await supabase.from("orders").select("id, amount_cents").eq("id", orderId).eq("buyer_id", userData.user.id).maybeSingle();
  if (!order) redirect("/panel");

  const { clientKey } = getAdyenConfig();
  const session = { id: sessionId, sessionData: "", clientKey, amount: { currency: PAYMENT_CURRENCY, value: order.amount_cents }, countryCode: PAYMENT_COUNTRY, orderId: order.id };
  return (
    <>
      <SiteHeader />
      <main className="purchase-page">
        <section className="purchase-card">
          <p className="eyebrow">Pago con tarjeta · Adyen</p>
          <h1>Confirmando tu pago…</h1>
          <AdyenCheckoutForm resume={{ session, redirectResult }} />
        </section>
      </main>
    </>
  );
}
