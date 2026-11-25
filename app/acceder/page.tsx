import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";
import { cookies } from "next/headers";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

export default async function AccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ modo?: string; mode?: string; error?: string }>;
}) {
  await cookies();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    await redirectSuperadminFromMarketplace(await createClient());
  }

  const params = searchParams ? await searchParams : {};
  const isRegister = params.modo === "registro" || params.mode === "signup" || params.mode === "register";

  return (
    <>
      <SiteHeader />
      <main className="access-page">
        <section className="access-card">
          {params.error === "enlace" && <p className="form-message" role="alert">No se pudo confirmar el enlace. Puede haber vencido o haberse abierto en otro navegador.</p>}
          <AuthForm key={isRegister ? "signup" : "signin"} initialMode={isRegister ? "signup" : "signin"} />
        </section>
      </main>
    </>
  );
}
