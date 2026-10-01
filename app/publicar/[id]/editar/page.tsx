import { notFound, redirect } from "next/navigation";
import { EditProductForm } from "@/components/edit-product-form";
import { SiteHeader } from "@/components/site-header";
import { publicImageUrl } from "@/lib/listings";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  await redirectSuperadminFromMarketplace(supabase);
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/acceder");

  const [{ data: product }, { data: images }] = await Promise.all([
    supabase.from("products").select("id, title, description, price_cents, category, item_condition, location, status").eq("id", id).maybeSingle(),
    supabase.from("product_images").select("id, storage_path, position").eq("product_id", id).order("position").limit(1),
  ]);
  if (!product) notFound();

  const image = images?.[0];
  return (
    <>
      <SiteHeader />
      <main className="publish-page">
        <section className="publish-card">
          <p className="eyebrow">Editar publicación</p>
          <h1>Actualiza tu producto</h1>
          <p>Los cambios se verán en el catálogo cuando la publicación esté marcada como publicada.</p>
          <EditProductForm product={product} currentImage={image ? { id: image.id, storagePath: image.storage_path, url: publicImageUrl(image.storage_path) ?? "" } : undefined} />
        </section>
      </main>
    </>
  );
}
