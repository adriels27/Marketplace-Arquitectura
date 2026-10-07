"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await createClient().auth.signOut();
    router.replace("/acceder");
    router.refresh();
  }

  return <button className="logout-button" disabled={loading} onClick={logout} type="button">{loading ? "Saliendo..." : "Cerrar sesión"}</button>;
}
