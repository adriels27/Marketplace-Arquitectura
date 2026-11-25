"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryRequestForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setMessage(null);
    const rawEmail = String(new FormData(event.currentTarget).get("email") ?? "");
    const email = rawEmail.trim().toLowerCase();
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/restablecer-contrasena`,
      });
      if (error) throw error;
      setMessage("Si existe una cuenta con este correo, recibirás un enlace. Si usas Gmail y no llega, prueba la variante con la que registraste tu cuenta, con puntos o sin ellos.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "";
      setMessage(!detail || /failed to fetch|networkerror|load failed/i.test(detail)
        ? "No pudimos conectar con el servicio de recuperación. Inténtalo más tarde."
        : detail);
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={requestRecovery}><label>Correo electrónico<input autoComplete="email" name="email" placeholder="tu@correo.com" required type="email" /></label><button className="button full-button" disabled={loading} type="submit">{loading ? "Enviando..." : "Enviar enlace de recuperación"}</button>{message && <p className="form-message" role="status">{message}</p>}</form>;
}
