import { notFound, redirect } from "next/navigation";
import { PublishProductForm } from "@/components/publish-product-form";
import { SiteHeader } from "@/components/site-header";
import { getActivePublishingRestriction } from "@/lib/moderation";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

export default async function PublishPage() {
  const supabase = await createClient();
  await redirectSuperadminFromMarketplace(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/acceder");

  const [profileResult, strikesResult] = await Promise.all([
    supabase.from("profiles").select("deleted_at, disabled_at").eq("id", claims.sub).maybeSingle(),
    supabase.from("moderation_warnings").select("strike_number, created_at").eq("user_id", claims.sub).eq("strike_number", 2).order("created_at", { ascending: false }).limit(1),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (strikesResult.error) throw strikesResult.error;
  if (profileResult.data?.deleted_at || profileResult.data?.disabled_at) notFound();
  const blockedUntil = getActivePublishingRestriction(strikesResult.data ?? []);

  return (
    <>
      <SiteHeader />
      <main className="publish-page">
        <section className="publish-card">
          <p className="eyebrow">Nueva publicación</p>
          <h1>¿Qué quieres vender?</h1>
          <p>Completa la información principal. Podrás editar la publicación más adelante.</p>
          <PublishProductForm blockedUntil={blockedUntil?.toISOString() ?? null} initialNow={new Date().toISOString()} />
        </section>
      </main>
    </>
  );
}
