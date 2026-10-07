import { NewPasswordForm } from "@/components/new-password-form";
import { SiteHeader } from "@/components/site-header";

export default function NewPasswordPage() {
  return <><SiteHeader /><main className="access-page"><section className="access-card"><p className="eyebrow">Nueva contraseña</p><h1>Elige una contraseña nueva</h1><p>Usa al menos 8 caracteres y no compartas tu contraseña con nadie.</p><NewPasswordForm /></section></main></>;
}
