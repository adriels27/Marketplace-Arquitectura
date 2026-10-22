"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  initialMode?: "signin" | "signup";
}

export function AuthForm({ initialMode = "signin" }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

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
      const errorCode = typeof error === "object" && error !== null && "code" in error ? error.code : null;
      const errorMessage = error instanceof Error ? error.message : "";
      setMessage(errorCode === "user_banned" || /user is banned|account.*banned/i.test(errorMessage)
        ? "Tu cuenta fue baneada permanentemente después de recibir el tercer strike por infringir las normas. No puedes iniciar sesión."
        : errorMessage || "No se pudo completar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  return (
    <>
      <p className="eyebrow">{isSignup ? "Registro" : "Bienvenido"}</p>
      <h1>{isSignup ? "Crea tu cuenta" : "Ingresa a tu cuenta"}</h1>
      <p>{isSignup ? "Regístrate para comprar, vender y administrar tus publicaciones." : "Compra, vende y administra tus publicaciones en un solo lugar."}</p>
      <form onSubmit={handleSubmit}>
        {isSignup && <><label>Nombre completo<input required name="fullName" minLength={2} maxLength={120} type="text" placeholder="Tu nombre y apellido" autoComplete="name" /></label><label>Fecha de nacimiento<input required name="birthDate" type="date" autoComplete="bday" /></label><p className="form-help">Debes tener al menos 18 años para crear una cuenta.</p></>}
        <label>Correo electrónico<input required name="email" type="email" placeholder="tu@correo.com" autoComplete="email" /></label>
        <label>Contraseña<input required minLength={8} name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete={isSignup ? "new-password" : "current-password"} /></label>
        <button className="button full-button" disabled={loading} type="submit">{loading ? "Procesando..." : isSignup ? "Crear cuenta" : "Ingresar"}</button>
        {message && <p className={`form-message${message.startsWith("Tu cuenta fue baneada") ? " banned-account-notice" : ""}`} role={message.startsWith("Tu cuenta fue baneada") ? "alert" : "status"}>{message}</p>}
        {!isSignup && <p className="access-footer"><Link href="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link></p>}
        <p className="access-footer">
          {isSignup ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"}{" "}
          <button className="text-button" onClick={() => { setMode(isSignup ? "signin" : "signup"); setMessage(null); }} type="button">
            {isSignup ? "Ingresar" : "Crear cuenta"}
          </button>
        </p>
      </form>
    </>
  );
}
