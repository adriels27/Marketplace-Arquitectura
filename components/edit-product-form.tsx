"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = ["Hogar", "Tecnología", "Moda", "Deportes", "Libros", "Otros"];
const conditions = ["Nuevo", "Como nuevo", "Usado · buen estado", "Usado · con detalles"];

type EditableProduct = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  category: string;
  item_condition: string;
  location: string;
  status: "draft" | "published" | "archived";
};

type CurrentImage = { id: string; url: string };

export function EditProductForm({ product, currentImage }: { product: EditableProduct; currentImage?: CurrentImage }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const amount = Number(String(form.get("price")).replace(",", "."));
    const selectedPhoto = form.get("photo");
    const photo = selectedPhoto instanceof File && selectedPhoto.size > 0 ? selectedPhoto : null;
    const removePhoto = form.get("removePhoto") === "on";

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Ingresa un precio válido mayor a cero.");
      setLoading(false);
      return;
    }
    if (photo && (!["image/jpeg", "image/png", "image/webp"].includes(photo.type) || photo.size > 5 * 1024 * 1024)) {
      setMessage("La foto debe ser JPG, PNG o WebP y pesar máximo 5 MB.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      let storagePath: string | null = null;
      if (photo) {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error("Tu sesión expiró. Ingresa nuevamente.");

        const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        storagePath = `${data.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, photo, {
          cacheControl: "3600",
          contentType: photo.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }

      const { data: previousPath, error } = await supabase.rpc("save_product_edit", {
        p_product_id: product.id,
        p_title: String(form.get("title")).trim(),
        p_description: String(form.get("description")).trim(),
        p_price_cents: Math.round(amount * 100),
        p_category: String(form.get("category")),
        p_item_condition: String(form.get("condition")),
        p_location: String(form.get("location")).trim(),
        p_status: String(form.get("status")),
        p_current_image_id: currentImage?.id ?? null,
        p_new_image_path: storagePath,
        p_remove_image: removePhoto,
      });
      if (error) {
        // Si se perdió la respuesta, la transacción pudo confirmarse.
        if (storagePath && /^(?:(?:22|23|42)[0-9A-Z]{3}|P0001|PGRST202)$/.test(error.code)) {
          await supabase.storage.from("product-images").remove([storagePath]);
        }
        throw new Error(error.message);
      }

      if (typeof previousPath === "string") {
        const { error: cleanupError } = await supabase.storage.from("product-images").remove([previousPath]);
        if (cleanupError) console.warn("No se pudo limpiar la foto anterior:", cleanupError.message);
      }

      router.push("/panel");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la publicación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="publish-form" onSubmit={handleSubmit}>
      <label>Nombre del producto<input defaultValue={product.title} name="title" minLength={3} maxLength={120} required /></label>
      <div className="form-row">
        <label>Precio (USD)<input defaultValue={(product.price_cents / 100).toFixed(2)} name="price" inputMode="decimal" required /></label>
        <label>Ubicación<input defaultValue={product.location} name="location" minLength={2} maxLength={100} required /></label>
      </div>
      <div className="form-row">
        <label>Categoría<select defaultValue={product.category} name="category" required>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Estado físico<select defaultValue={product.item_condition} name="condition" required>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
      </div>
      <label>Visibilidad<select defaultValue={product.status} name="status" required><option value="published">Publicado</option><option value="draft">Borrador</option><option value="archived">Archivado</option></select></label>
      {currentImage && <div className="current-image"><div className="current-image-preview" style={{ backgroundImage: `url("${currentImage.url}")` }} /><label className="remove-photo"><input name="removePhoto" type="checkbox" /> Eliminar foto actual</label></div>}
      <label>{currentImage ? "Reemplazar foto principal" : "Foto principal"}<input accept="image/jpeg,image/png,image/webp" name="photo" type="file" /></label>
      <label>Descripción<textarea defaultValue={product.description} name="description" minLength={10} maxLength={3000} required rows={6} /></label>
      <p className="form-help">Puedes cambiar cualquier campo. Las fotos admiten JPG, PNG o WebP hasta 5 MB.</p>
      <button className="button" disabled={loading} type="submit">{loading ? "Guardando..." : "Guardar cambios"}</button>
      {message && <p className="form-message" role="status">{message}</p>}
    </form>
  );
}
