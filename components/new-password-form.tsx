"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NewPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [validRecovery, setValidRecovery] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    async function verifyRecovery() {
      const { data } = await createClient().auth.getUser();
      setValidRecovery(Boolean(data.user));
      setLoading(false);
    }
    void verifyRecovery();
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setLoading(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) { setMessage("La contraseña debe tener al menos 8 caracteres."); setLoading(false); return; }
    if (password !== confirmation) { setMessage("Las contraseñas no coinciden."); setLoading(false); return; }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      await supabase.auth.signOut();
      setValidRecovery(false);
      setCompleted(true);
      setMessage("Contraseña actualizada. Ya puedes ingresar con tu nueva contraseña.");
    }
    setLoading(false);
  }

  if (loading) return <p className="form-help">Validando el enlace de recuperación...</p>;
  if (completed) return <><p className="form-message" role="status">{message}</p><p className="access-footer"><Link href="/acceder">Ingresar ahora</Link></p></>;
  if (!validRecovery) return <><p className="form-message">Este enlace no es válido o ya venció. Solicita uno nuevo.</p><p className="access-footer"><Link href="/recuperar-contrasena">Solicitar otro enlace</Link></p></>;
  return <form onSubmit={updatePassword}><label>Nueva contraseña<input autoComplete="new-password" minLength={8} name="password" required type="password" /></label><label>Confirma la nueva contraseña<input autoComplete="new-password" minLength={8} name="confirmation" required type="password" /></label><button className="button full-button" disabled={loading} type="submit">Guardar nueva contraseña</button>{message && <p className="form-message" role="status">{message}</p>}<p className="access-footer"><Link href="/acceder">Volver a ingresar</Link></p></form>;
}
