import { NextResponse } from "next/server";
import { getAdyenConfig, getCheckoutApi, PAYMENT_COUNTRY, PAYMENT_CURRENCY } from "@/lib/adyen";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Crea la sesión de pago. El monto sale SIEMPRE de la base de datos, nunca del navegador.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Tu sesión expiró. Ingresa nuevamente." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Pedido no válido." }, { status: 400 });

  const { data: order } = await supabase.from("orders").select("id, reference, amount_cents, status")
    .eq("id", orderId).eq("buyer_id", userData.user.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "No encontramos tu pedido." }, { status: 404 });
  if (order.status !== "pending_transfer") return NextResponse.json({ error: "Este pedido ya no está pendiente de pago." }, { status: 409 });

  try {
    const { clientKey, merchantAccount } = getAdyenConfig();
    const reference = `${order.reference}-${crypto.randomUUID().slice(0, 8)}`;
    const amount = { currency: PAYMENT_CURRENCY, value: order.amount_cents };
    const origin = new URL(request.url).origin;

    const session = await getCheckoutApi().PaymentsApi.sessions({
      merchantAccount,
      amount,
      countryCode: PAYMENT_COUNTRY,
      reference,
      returnUrl: `${origin}/pago/adyen/respuesta?orderId=${order.id}`,
      shopperLocale: "es-ES",
    });

    const { error } = await createAdminClient().from("orders")
      .update({ payment_method: "adyen", adyen_reference: reference }).eq("id", order.id);
    if (error) return NextResponse.json({ error: `No se pudo preparar el pago: ${error.message}` }, { status: 500 });

    return NextResponse.json({ id: session.id, sessionData: session.sessionData, clientKey, amount, countryCode: PAYMENT_COUNTRY, orderId: order.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la sesión de pago." }, { status: 500 });
  }
}
