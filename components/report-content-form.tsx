"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ReportContentForm({ targetId, targetType }: { targetId: string; targetType: "product" | "review" }) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await createClient().rpc("create_moderation_report", {
        p_target_type: targetType,
        p_target_id: targetId,
        p_category: String(form.get("category")),
        p_description: String(form.get("description")).trim(),
      });
      setMessage(error ? error.message : "Reporte enviado para revisión.");
      if (!error) formElement.reset();
    } catch {
      setMessage("No se pudo enviar el reporte. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="report-form">
      <summary>Reportar contenido</summary>
      <form onSubmit={submitReport}>
        <label>Categoría<select name="category" required defaultValue=""><option disabled value="">Selecciona una</option><option>Contenido engañoso</option><option>Contenido inapropiado</option><option>Spam</option><option>Otro</option></select></label>
        <label>Motivo<textarea name="description" minLength={10} maxLength={1000} required rows={3} /></label>
        <button className="button button-small" disabled={loading} type="submit">{loading ? "Enviando..." : "Enviar reporte"}</button>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </details>
  );
}