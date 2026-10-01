"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const fullName = String(form.get("fullName") ?? "").trim();
    const birthDate = String(form.get("birthDate") ?? "");

    try {
      const supabase = createClient();
      if (mode === "signup") {
        const enteredDate = new Date(`${birthDate}T00:00:00`);
        const today = new Date();
        const age = today.getFullYear() - enteredDate.getFullYear() - (today < new Date(today.getFullYear(), enteredDate.getMonth(), enteredDate.getDate()) ? 1 : 0);
        if (!fullName || !birthDate || Number.isNaN(enteredDate.valueOf()) || enteredDate > today) {
          throw new Error("Completa tu nombre y una fecha de nacimiento válida.");
        }
        if (age < 18) {
          throw new Error("Debes tener al menos 18 años para crear una cuenta.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/panel`,
            data: { full_name: fullName, birth_date: birthDate },
          },
        });
        if (error) throw error;
        setMessage("Revisa tu correo para confirmar la cuenta y luego podrás ingresar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: userData } = await supabase.auth.getUser();
        const { data: profile } = userData.user
          ? await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle()
          : { data: null };
        router.replace(profile?.role === "admin" ? "/administracion/usuarios" : "/panel");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  return (
    <form onSubmit={handleSubmit}>
      {isSignup && <><label>Nombre completo<input required name="fullName" minLength={2} maxLength={120} type="text" placeholder="Tu nombre y apellido" autoComplete="name" /></label><label>Fecha de nacimiento<input required name="birthDate" type="date" autoComplete="bday" /></label><p className="form-help">Debes tener al menos 18 años para crear una cuenta.</p></>}
      <label>Correo electrónico<input required name="email" type="email" placeholder="tu@correo.com" autoComplete="email" /></label>
      <label>Contraseña<input required minLength={8} name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete={isSignup ? "new-password" : "current-password"} /></label>
      <button className="button full-button" disabled={loading} type="submit">{loading ? "Procesando..." : isSignup ? "Crear cuenta" : "Ingresar"}</button>
      {message && <p className="form-message" role="status">{message}</p>}
      <p className="access-footer">
        {isSignup ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
        <button className="text-button" onClick={() => { setMode(isSignup ? "signin" : "signup"); setMessage(null); }} type="button">
          {isSignup ? "Ingresar" : "Crear cuenta"}
        </button>
      </p>
    </form>
  );
}
