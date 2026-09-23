"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function BuyerReviewForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage(null);
    const comment = String(new FormData(event.currentTarget).get("comment") ?? "").trim();
    const { error } = await createClient().rpc("create_seller_review", { p_order_id: orderId, p_rating: rating, p_comment: comment });
    if (error) setMessage(error.message); else { setMessage("Calificación enviada. Gracias por tu comentario."); router.refresh(); }
    setLoading(false);
  }

  return <form className="buyer-review-form" onSubmit={submitReview}><strong>¿Cómo fue tu compra?</strong><div aria-label="Calificación" className="star-picker">{[1, 2, 3, 4, 5].map((value) => <button aria-label={`${value} estrellas`} className={value <= rating ? "star-selected" : ""} key={value} onClick={() => setRating(value)} type="button">★</button>)}</div><label className="sr-only" htmlFor={`review-${orderId}`}>Comentario sobre el vendedor</label><textarea id={`review-${orderId}`} maxLength={1000} minLength={3} name="comment" placeholder="Cuéntanos cómo fue la compra" required rows={2} /><button className="button button-small" disabled={loading} type="submit">{loading ? "Enviando..." : "Calificar vendedor"}</button>{message && <p className="form-message" role="status">{message}</p>}</form>;
}
