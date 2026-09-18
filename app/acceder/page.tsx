import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";

export default function AccessPage() {
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
