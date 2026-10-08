-- Edición segura de los datos públicos y perfil de vendedor ampliado.
begin;

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
create policy "Users can update their public profile" on public.profiles for update to authenticated
using (id = (select auth.uid()) and (select public.is_active_account()))
with check (id = (select auth.uid()) and (select public.is_active_account()));

drop function if exists public.get_seller_profile(uuid);
create function public.get_seller_profile(p_seller_id uuid)
returns table (seller_id uuid, full_name text, avatar_url text, average_rating numeric, review_count bigint, sold_count bigint)
language sql security definer set search_path = '' as $$
  select p.id, coalesce(nullif(p.full_name, ''), 'Vendedor de Marketplace Arqui'), p.avatar_url,
         coalesce(round(avg(r.rating)::numeric, 1), 0), count(r.id),
         (select count(*) from public.products sp where sp.seller_id = p.id and sp.status = 'sold')
  from public.profiles p left join public.seller_reviews r on r.seller_id = p.id
  where p.id = p_seller_id and p.deleted_at is null and p.disabled_at is null
  group by p.id, p.full_name, p.avatar_url;
$$;

drop function if exists public.get_seller_reviews(uuid);
create function public.get_seller_reviews(p_seller_id uuid)
returns table (review_id uuid, rating smallint, comment text, created_at timestamptz)
language sql security definer set search_path = '' as $$
  select r.id, r.rating, r.comment, r.created_at
  from public.seller_reviews r
  where r.seller_id = p_seller_id
  order by r.created_at desc;
$$;
grant execute on function public.get_seller_profile(uuid) to anon, authenticated;
grant execute on function public.get_seller_reviews(uuid) to anon, authenticated;

commit;
