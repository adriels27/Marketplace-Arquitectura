"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileEditor({ initialName, initialAvatar }: { initialName: string; initialAvatar: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [file, setFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Tu sesión expiró. Ingresa nuevamente.");
      let nextAvatar = removeAvatar ? null : avatarUrl;
      if (file) {
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
        const knownTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", heic: "image/heic", heif: "image/heif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff" };
        const contentType = file.type || knownTypes[extension] || "";
        if (!Object.values(knownTypes).includes(contentType) || file.size > 5 * 1024 * 1024) throw new Error("Usa una foto JPG, PNG, WebP, GIF, AVIF, HEIC, BMP o TIFF de hasta 5 MB.");
        const path = `${authData.user.id}/profile/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { contentType, upsert: false });
        if (uploadError) throw uploadError;
        nextAvatar = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("profiles").update({ full_name: name.trim(), avatar_url: nextAvatar }).eq("id", authData.user.id);
      if (error) throw error;
      setAvatarUrl(nextAvatar); setFile(null); setRemoveAvatar(false); setMessage("Tu perfil se guardó correctamente."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el perfil."); }
    finally { setLoading(false); }
  }

  return <form className="publish-form profile-form" onSubmit={save}>
    <div className="profile-photo-row"><span className="seller-avatar-large profile-avatar-preview" style={avatarUrl && !removeAvatar ? { backgroundImage: `url("${avatarUrl}")` } : undefined}>{(!avatarUrl || removeAvatar) && (name.trim()[0] || "M").toUpperCase()}</span><label>Foto de perfil<input accept="image/*" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setRemoveAvatar(false); }} type="file" /></label></div>
    {avatarUrl && <label className="remove-photo"><input checked={removeAvatar} onChange={(event) => setRemoveAvatar(event.target.checked)} type="checkbox" /> Quitar foto actual</label>}
    <label>Nombre público<input autoComplete="name" maxLength={80} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} /></label>
    <p className="form-help">Este nombre y tu foto aparecerán en tu perfil público y junto a tus productos. Tus reseñas y ventas se mostrarán automáticamente.</p>
    <button className="button" disabled={loading} type="submit">{loading ? "Guardando…" : "Guardar perfil"}</button>{message && <p className="form-message" role="status">{message}</p>}
  </form>;
}
