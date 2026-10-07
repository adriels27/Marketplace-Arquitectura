import Link from "next/link";
import { PasswordRecoveryRequestForm } from "@/components/password-recovery-request-form";
import { SiteHeader } from "@/components/site-header";

export default function PasswordRecoveryPage() {
  return <><SiteHeader /><main className="access-page"><section className="access-card"><p className="eyebrow">Recuperación de acceso</p><h1>Restablece tu contraseña</h1><p>Escribe tu correo y te enviaremos un enlace seguro para crear una contraseña nueva.</p><PasswordRecoveryRequestForm /><p className="access-footer"><Link href="/acceder">Volver a ingresar</Link></p></section></main></>;
}
