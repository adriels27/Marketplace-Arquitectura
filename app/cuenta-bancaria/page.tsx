import Link from "next/link";
import { redirect } from "next/navigation";
import { SellerBankDetailsForm } from "@/components/seller-bank-details-form";
import { SiteHeader } from "@/components/site-header";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

export default async function BankAccountPage() {
  const supabase = await createClient(); const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/acceder");
  await redirectSuperadminFromMarketplace(supabase);
  return <><SiteHeader /><main className="publish-page"><Link className="back-link" href="/panel">← Volver a mi panel</Link><section className="publish-card"><p className="eyebrow">Para recibir pagos</p><h1>Datos bancarios</h1><p>Registra la cuenta a la que los compradores transferirán directamente. Tú revisarás y aprobarás sus comprobantes desde tu panel.</p><SellerBankDetailsForm /></section></main></>;
}
