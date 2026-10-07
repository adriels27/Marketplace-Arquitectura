"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryRequestForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/restablecer-contrasena`,
    });
    setMessage(error ? error.message : "Si existe una cuenta con este correo, recibirás un enlace para restablecer tu contraseña.");
    setLoading(false);
  }

  return <form onSubmit={requestRecovery}><label>Correo electrónico<input autoComplete="email" name="email" placeholder="tu@correo.com" required type="email" /></label><button className="button full-button" disabled={loading} type="submit">{loading ? "Enviando..." : "Enviar enlace de recuperación"}</button>{message && <p className="form-message" role="status">{message}</p>}</form>;
}
