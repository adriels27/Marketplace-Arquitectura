import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";
import { cookies } from "next/headers";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

export default async function AccessPage() {
  await cookies();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    await redirectSuperadminFromMarketplace(await createClient());
  }
  return (
    <>
      <SiteHeader />
      <main className="access-page">
        <section className="access-card">
          <p className="eyebrow">Bienvenido</p>
          <h1>Ingresa a tu cuenta</h1>
          <p>Compra, vende y administra tus publicaciones en un solo lugar.</p>
          <AuthForm />
        </section>
      </main>
    </>
  );
}
