"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = ["Hogar", "Tecnología", "Moda", "Deportes", "Libros", "Otros"];
const conditions = ["Nuevo", "Como nuevo", "Usado · buen estado", "Usado · con detalles"];

export function PublishProductForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const amount = Number(String(form.get("price")).replace(",", "."));
    const submittedPhoto = form.get("photo");
    const photo = submittedPhoto instanceof File && submittedPhoto.size > 0 ? submittedPhoto : null;
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
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Tu sesión expiró. Ingresa nuevamente.");

      let storagePath: string | null = null;
      if (photo) {
        const extension = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        storagePath = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, photo, {
          cacheControl: "3600",
          contentType: photo.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }

      const { data: product, error } = await supabase.from("products").insert({
        title: String(form.get("title")).trim(),
        description: String(form.get("description")).trim(),
        price_cents: Math.round(amount * 100),
        category: String(form.get("category")),
        item_condition: String(form.get("condition")),
        location: String(form.get("location")).trim(),
        status: "published",
      }).select("id").single();
      if (error || !product) {
        if (storagePath) await supabase.storage.from("product-images").remove([storagePath]);
        throw error ?? new Error("No se pudo crear el producto.");
      }

      if (storagePath) {
        const { error: imageError } = await supabase.from("product_images").insert({ product_id: product.id, storage_path: storagePath });
        if (imageError) {
          await supabase.from("products").delete().eq("id", product.id);
          await supabase.storage.from("product-images").remove([storagePath]);
          throw imageError;
        }
      }
      router.push("/panel");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo publicar el producto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="publish-form" onSubmit={handleSubmit}>
      <label>Nombre del producto<input name="title" minLength={3} maxLength={120} placeholder="Ej.: Escritorio de madera" required /></label>
      <div className="form-row">
        <label>Precio (USD)<input name="price" inputMode="decimal" placeholder="45.00" required /></label>
        <label>Ubicación<input name="location" minLength={2} maxLength={100} placeholder="Ej.: Quito" required /></label>
      </div>
      <div className="form-row">
        <label>Categoría<select defaultValue="" name="category" required><option disabled value="">Selecciona una</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Estado del producto<select defaultValue="" name="condition" required><option disabled value="">Selecciona una</option>{conditions.map((condition) => <option key={condition}>{condition}</option>)}</select></label>
      </div>
      <label>Foto principal (opcional)<input accept="image/jpeg,image/png,image/webp" name="photo" type="file" /></label>
      <label>Descripción<textarea name="description" minLength={10} maxLength={3000} placeholder="Describe el producto, su estado y qué incluye." required rows={6} /></label>
      <p className="form-help">Formatos permitidos: JPG, PNG o WebP. Máximo 5 MB.</p>
      <button className="button" disabled={loading} type="submit">{loading ? "Publicando..." : "Publicar producto"}</button>
      {message && <p className="form-message" role="status">{message}</p>}
    </form>
  );
}
