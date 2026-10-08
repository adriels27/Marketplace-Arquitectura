"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function FavoriteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!uuidPattern.test(productId) || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) void supabase.from("product_favorites").select("product_id").eq("product_id", productId).maybeSingle().then(({ data: favorite, error }) => {
        if (error) setErrorMessage("No se pudo cargar favoritos. Aplica la migración de funciones sociales en Supabase.");
        else setSaved(Boolean(favorite));
      });
    });
  }, [productId]);
  async function toggle() {
    if (!userId) { router.push("/acceder"); return; }
    setLoading(true); setErrorMessage(null);
    const supabase = createClient();
    const result = saved
      ? await supabase.from("product_favorites").delete().eq("product_id", productId).eq("user_id", userId)
      : await supabase.from("product_favorites").insert({ product_id: productId, user_id: userId });
    if (!result.error) { setSaved(!saved); router.refresh(); }
    else setErrorMessage(result.error.code === "PGRST205" || result.error.code === "42P01" ? "Aplica la migración de funciones sociales en Supabase para activar favoritos." : result.error.message);
    setLoading(false);
  }
  if (!uuidPattern.test(productId) || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  return <span className="favorite-control"><button aria-label={saved ? "Quitar de favoritos" : "Guardar en favoritos"} aria-pressed={saved} className={`favorite-button ${saved ? "is-favorite" : ""}`} disabled={loading} onClick={toggle} type="button">{saved ? "♥" : "♡"}</button>{errorMessage && <span className="favorite-error" role="status">{errorMessage}</span>}</span>;
}
