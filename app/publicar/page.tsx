import { redirect } from "next/navigation";
import { PublishProductForm } from "@/components/publish-product-form";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function PublishPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/acceder");

  return (
    <>
      <SiteHeader />
      <main className="publish-page">
        <section className="publish-card">
          <p className="eyebrow">Nueva publicación</p>
          <h1>¿Qué quieres vender?</h1>
          <p>Completa la información principal. Podrás editar la publicación más adelante.</p>
          <PublishProductForm />
        </section>
      </main>
    </>
  );
}
