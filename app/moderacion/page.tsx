import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ModerationConsole } from "@/components/moderation-console";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function ModerationPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/acceder");

  const { data: currentProfile } = await supabase.from("profiles").select("role, deleted_at, disabled_at").eq("id", userId).maybeSingle();
  if (currentProfile?.deleted_at || currentProfile?.disabled_at) notFound();
  if (currentProfile?.role === "admin") redirect("/administracion/usuarios");
  if (currentProfile?.role !== "moderator") redirect("/panel");

  const [profilesResult, productsResult, reviewsResult, reportsResult] = await Promise.all([
    supabase.from("moderation_profiles").select("id, email, full_name, role").order("created_at", { ascending: false }),
    // "Eliminar" es un borrado lógico: se guarda para auditoría, pero no debe
    // volver a aparecer en la lista de contenido que el moderador puede gestionar.
    supabase.from("products").select("id, title, seller_id, moderation_status, suspended_until").neq("moderation_status", "deleted").order("created_at", { ascending: false }).limit(100),
    supabase.from("seller_reviews").select("id, comment, rating, seller_id, moderation_status").neq("moderation_status", "deleted").order("created_at", { ascending: false }).limit(100),
    supabase.from("moderation_reports").select("id, reporter_id, target_type, target_id, category, description, status, created_at").neq("status", "resolved").order("created_at", { ascending: true }),
  ]);

  return <><SiteHeader /><main className="admin-page moderation-page"><Link className="back-link" href="/panel">← Volver a mi panel</Link><section className="admin-heading"><p className="eyebrow">Moderación</p><h1>Centro de moderación</h1><p>Revisa reportes, contenido y advertencias.</p></section><ModerationConsole profiles={profilesResult.data ?? []} products={productsResult.data ?? []} reviews={reviewsResult.data ?? []} reports={reportsResult.data ?? []} isAdmin={false} /></main></>;
}
