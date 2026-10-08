import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/profile-editor";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/acceder");
  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle();
  return <><SiteHeader /><main className="publish-page"><section className="publish-card"><Link className="back-link" href="/panel">← Volver a mi espacio</Link><p className="eyebrow">Tu identidad en Marketplace Arqui</p><h1>Edita tu perfil</h1><p>Personaliza cómo te ven las personas que visitan tus publicaciones.</p><ProfileEditor initialName={profile?.full_name ?? ""} initialAvatar={profile?.avatar_url ?? null} /></section></main></>;
}
