"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; email: string; full_name: string | null; role: string };
type Product = { id: string; title: string; seller_id: string; moderation_status: string; suspended_until: string | null };
type Review = { id: string; comment: string; rating: number; seller_id: string; moderation_status: string };
type Report = { id: string; reporter_id: string; target_type: "product" | "review"; target_id: string; category: string; description: string; status: string; created_at: string };

export function ModerationConsole({ profiles, products, reviews, reports, isAdmin }: { profiles: Profile[]; products: Product[]; reviews: Review[]; reports: Report[]; isAdmin: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function runAction(key: string, operation: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key);
    setMessage(null);
    try {
      const { error } = await operation();
      setMessage(error?.message ?? "Acción registrada.");
      if (!error) router.refresh();
    } catch {
      setMessage("No se pudo completar la acción. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function submitWarning(event: FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const reason = String(form.get("reason")).trim();
    formElement.reset();
    await runAction(`warning-${userId}`, () => createClient().rpc("send_moderation_warning", { p_user_id: userId, p_reason: reason }));
  }

  async function submitProductAction(event: FormEvent<HTMLFormElement>, productId: string, action: "hide" | "delete" | "suspend") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(`${action}-${productId}`, () => createClient().rpc("moderate_product_action", {
      p_product_id: productId,
      p_action: action,
      p_reason: String(form.get("reason")).trim(),
      p_duration_hours: action === "suspend" ? Number(form.get("duration")) : null,
    }));
  }

  async function submitReviewAction(event: FormEvent<HTMLFormElement>, reviewId: string, action: "hide" | "delete") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runAction(`${action}-review-${reviewId}`, () => createClient().rpc("moderate_review_action", {
      p_review_id: reviewId,
      p_action: action,
      p_reason: String(form.get("reason")).trim(),
    }));
  }

  async function reportAction(reportId: string, action: "review" | "escalate" | "resolve") {
    await runAction(`${action}-report-${reportId}`, () => createClient().rpc("manage_moderation_report", {
      p_report_id: reportId,
      p_action: action,
      p_note: action === "resolve" ? "Caso revisado por el Superadministrador." : "",
    }));
  }

  return (
    <div className="moderation-console">
      {message && <p className="form-message" role="status">{message}</p>}
      <section className="moderation-section">
        <div className="section-heading"><div><p className="eyebrow">Casos</p><h2>Reportes</h2></div><span>{reports.length} abiertos o escalados</span></div>
        {reports.length ? <div className="moderation-list">{reports.map((report) => {
          const product = report.target_type === "product" ? products.find((item) => item.id === report.target_id) : null;
          const review = report.target_type === "review" ? reviews.find((item) => item.id === report.target_id) : null;
          const targetDescription = product?.title ?? review?.comment ?? "El contenido reportado ya no está disponible.";
          return <article className="moderation-item" key={report.id}>
          <div><strong>{report.category} · {report.target_type === "product" ? "Publicación" : "Comentario"}</strong><p>{report.description}</p><blockquote>{targetDescription}</blockquote><small>Reporte {report.id} · {report.status}</small></div>
          <div className="moderation-actions">
            {report.status === "open" && <button className="button button-small" disabled={busy !== null} onClick={() => reportAction(report.id, "review")} type="button">Revisar</button>}
            {!isAdmin && report.status !== "escalated" && report.status !== "resolved" && <button className="text-button" disabled={busy !== null} onClick={() => reportAction(report.id, "escalate")} type="button">Escalar al Superadministrador</button>}
            {isAdmin && report.status !== "resolved" && <button className="button button-small" disabled={busy !== null} onClick={() => reportAction(report.id, "resolve")} type="button">Resolver</button>}
          </div>
        </article>; })}</div> : <p className="empty-state">No hay reportes pendientes.</p>}
      </section>

      <section className="moderation-section">
        <div className="section-heading"><div><p className="eyebrow">Catálogo</p><h2>Publicaciones</h2></div></div>
        {products.length ? <div className="moderation-list">{products.map((product) => <article className="moderation-item" key={product.id}>
          <div><strong>{product.title}</strong><p>Estado de moderación: {product.moderation_status}{product.suspended_until ? ` · hasta ${new Date(product.suspended_until).toLocaleString("es-EC")}` : ""}</p></div>
          <form className="moderation-actions" onSubmit={(event) => submitProductAction(event, product.id, "hide")}><input aria-label="Motivo para ocultar" name="reason" minLength={10} maxLength={1000} placeholder="Motivo (mín. 10 caracteres)" required /><button className="text-button" disabled={busy !== null} type="submit">Ocultar</button></form>
          <form className="moderation-actions" onSubmit={(event) => submitProductAction(event, product.id, "suspend")}><input aria-label="Motivo para suspender" name="reason" minLength={10} maxLength={1000} placeholder="Motivo de suspensión" required /><select aria-label="Duración de la suspensión" name="duration" defaultValue="24"><option value="24">24 horas</option><option value="72">3 días</option><option value="168">7 días</option><option value="720">30 días</option></select><button className="text-button" disabled={busy !== null} type="submit">Suspender</button></form>
          <form className="moderation-actions" onSubmit={(event) => submitProductAction(event, product.id, "delete")}><input aria-label="Motivo para eliminar" name="reason" minLength={10} maxLength={1000} placeholder="Motivo para retirar" required /><button className="reject-button" disabled={busy !== null} type="submit">Eliminar</button></form>
        </article>)}</div> : <p className="empty-state">No hay publicaciones para moderar.</p>}
      </section>

      <section className="moderation-section">
        <div className="section-heading"><div><p className="eyebrow">Comunidad</p><h2>Comentarios</h2></div></div>
        {reviews.length ? <div className="moderation-list">{reviews.map((review) => <article className="moderation-item" key={review.id}>
          <div><strong>{review.rating}/5 · {review.moderation_status}</strong><p>{review.comment}</p><small>Comentario {review.id}</small></div>
          <form className="moderation-actions" onSubmit={(event) => submitReviewAction(event, review.id, "hide")}><input aria-label="Motivo para ocultar comentario" name="reason" minLength={10} maxLength={1000} placeholder="Motivo (mín. 10 caracteres)" required /><button className="text-button" disabled={busy !== null} type="submit">Ocultar</button></form>
          <form className="moderation-actions" onSubmit={(event) => submitReviewAction(event, review.id, "delete")}><input aria-label="Motivo para eliminar comentario" name="reason" minLength={10} maxLength={1000} placeholder="Motivo para retirar" required /><button className="reject-button" disabled={busy !== null} type="submit">Eliminar</button></form>
        </article>)}</div> : <p className="empty-state">No hay comentarios para moderar.</p>}
      </section>

      <section className="moderation-section">
        <div className="section-heading"><div><p className="eyebrow">Cuentas</p><h2>Usuarios</h2></div><span>Consulta y advertencias; sin controles de cuenta</span></div>
        <div className="moderation-list">{profiles.filter((profile) => profile.role === "user").map((profile) => <article className="moderation-item" key={profile.id}>
          <div><strong>{profile.full_name || "Sin nombre"}</strong><p>{profile.email}</p></div>
          <form className="moderation-actions" onSubmit={(event) => submitWarning(event, profile.id)}><input aria-label={`Motivo de advertencia para ${profile.email}`} name="reason" minLength={10} maxLength={1000} placeholder="Motivo de advertencia" required /><button className="text-button" disabled={busy !== null} type="submit">Enviar advertencia</button></form>
        </article>)}</div>
      </section>
    </div>
  );
}