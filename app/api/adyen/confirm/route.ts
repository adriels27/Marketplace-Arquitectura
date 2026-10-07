import { NextResponse } from "next/server";
import { getCheckoutApi, PAYMENT_CURRENCY } from "@/lib/adyen";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// El navegador solo avisa "terminé". La verdad la consulta el servidor directamente a Adyen.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Tu sesión expiró. Ingresa nuevamente." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { orderId, sessionId, sessionResult } = (body ?? {}) as Record<string, unknown>;
  if (typeof orderId !== "string" || typeof sessionId !== "string" || typeof sessionResult !== "string") {
    return NextResponse.json({ error: "Datos de pago incompletos." }, { status: 400 });
  }

  const { data: order } = await supabase.from("orders").select("id, amount_cents, status, adyen_reference")
    .eq("id", orderId).eq("buyer_id", userData.user.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "No encontramos tu pedido." }, { status: 404 });
  if (order.status === "verified_by_seller") return NextResponse.json({ ok: true });

  try {
    const result = await getCheckoutApi().PaymentsApi.getResultOfPaymentSession(sessionId, sessionResult);
    const payment = result.payments?.[0];
    const approved = result.status === "completed" && result.reference === order.adyen_reference
      && payment?.resultCode === "Authorised" && payment.amount?.value === order.amount_cents && payment.amount?.currency === PAYMENT_CURRENCY;
    if (!approved) return NextResponse.json({ ok: false, status: result.status ?? "unknown", error: "El pago no fue aprobado. No se realizó ningún cobro." }, { status: 402 });

    const { error } = await createAdminClient().from("orders").update({
      status: "verified_by_seller", // reutiliza el flujo existente: marca el producto como vendido y habilita la reseña
      adyen_psp_reference: payment?.pspReference ?? null,
      verification_note: `Pago con tarjeta confirmado por Adyen (referencia ${payment?.pspReference ?? "s/n"}).`,
      verified_at: new Date().toISOString(),
    }).eq("id", order.id).eq("status", "pending_transfer");
    if (error) return NextResponse.json({ error: `Adyen aprobó el pago (${payment?.pspReference}), pero falló el guardado: ${error.message}` }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo confirmar el pago." }, { status: 500 });
  }
}
