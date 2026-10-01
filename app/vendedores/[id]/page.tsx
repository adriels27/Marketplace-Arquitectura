import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportContentForm } from "@/components/report-content-form";
import { SiteHeader } from "@/components/site-header";
import { redirectSuperadminFromMarketplace } from "@/lib/supabase/access";
import { createClient } from "@/lib/supabase/server";

type SellerProfile = { seller_id: string; full_name: string; average_rating: number | string; review_count: number; sold_count: number };
type SellerReview = { review_id: string; rating: number; comment: string; created_at: string };

function stars(rating: number) { return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)); }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(value)); }

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  await redirectSuperadminFromMarketplace(supabase);
  const [profileResult, reviewsResult] = await Promise.all([
    supabase.rpc("get_seller_profile", { p_seller_id: id }),
    supabase.rpc("get_seller_reviews", { p_seller_id: id }),
  ]);
  const profile = (Array.isArray(profileResult.data) ? profileResult.data[0] : profileResult.data) as SellerProfile | null;
  if (!profile) notFound();
  const reviews = (reviewsResult.data ?? []) as SellerReview[];
  const average = Number(profile.average_rating);

  return <><SiteHeader /><main className="seller-page"><Link className="back-link" href="/">← Volver al catálogo</Link><section className="seller-profile-card"><span className="seller-avatar-large">{profile.full_name[0]}</span><div><p className="eyebrow">Perfil de vendedor</p><h1>{profile.full_name}</h1><p className="seller-rating">{profile.review_count ? <><span>{stars(average)}</span> {average.toFixed(1)} · {profile.review_count} calificación{profile.review_count === 1 ? "" : "es"}</> : "Aún no tiene calificaciones"}</p></div><div className="seller-stats"><strong>{profile.sold_count}</strong><span>productos vendidos</span></div></section><section className="reviews-section"><div className="section-heading"><div><p className="eyebrow">Experiencias de compradores</p><h2>Calificaciones y comentarios</h2></div></div>{reviews.length ? <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.review_id}><strong className="review-stars">{stars(review.rating)}</strong><p>{review.comment}</p><span>{formatDate(review.created_at)}</span><ReportContentForm targetId={review.review_id} targetType="review" /></article>)}</div> : <p className="empty-state">Todavía no hay comentarios para este vendedor.</p>}</section></main></>;
}
