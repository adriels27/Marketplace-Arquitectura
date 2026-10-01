alter type public.user_role add value if not exists 'moderator';

alter table public.products
  add column moderation_status text not null default 'active'
    check (moderation_status in ('active', 'hidden', 'suspended', 'deleted')),
  add column suspended_until timestamptz;

alter table public.seller_reviews
  add column moderation_status text not null default 'active'
    check (moderation_status in ('active', 'hidden', 'deleted'));

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'review')),
  target_id uuid not null,
  category text not null check (char_length(category) between 3 and 60),
  description text not null check (char_length(description) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'in_review', 'escalated', 'resolved')),
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moderation_reports_status_created_idx on public.moderation_reports (status, created_at desc);
create index moderation_reports_target_idx on public.moderation_reports (target_type, target_id);

create table public.moderation_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 10 and 1000),
  created_at timestamptz not null default now()
);

create index moderation_warnings_user_created_idx on public.moderation_warnings (user_id, created_at desc);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references public.profiles(id) on delete restrict,
  target_type text not null check (target_type in ('product', 'review', 'user', 'report')),
  target_id uuid not null,
  action text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.moderation_reports enable row level security;
alter table public.moderation_warnings enable row level security;
alter table public.moderation_actions enable row level security;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text in ('moderator', 'admin')
  );
$$;

revoke all on function public.is_moderator() from public, anon;
grant execute on function public.is_moderator() to authenticated;

drop policy if exists "Administrators can view all profiles" on public.profiles;
create policy "Administrators can view all profiles"
on public.profiles for select to authenticated
using ((select public.is_admin()));

create view public.moderation_profiles as
select id, email, full_name, role, created_at
from public.profiles
where (select public.is_moderator());
grant select on public.moderation_profiles to authenticated;

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
on public.products for select
using (
  (status = 'published' and (moderation_status = 'active' or (moderation_status = 'suspended' and suspended_until <= now())))
  or (select auth.uid()) = seller_id
  or (select public.is_moderator())
);

drop policy if exists "Product images are visible with published products" on public.product_images;
create policy "Product images are visible with published products"
on public.product_images for select
using (
  exists (
    select 1 from public.products product
    where product.id = product_id
      and (
        (product.status = 'published' and (product.moderation_status = 'active' or (product.moderation_status = 'suspended' and product.suspended_until <= now())))
        or product.seller_id = (select auth.uid())
        or (select public.is_moderator())
      )
  )
);

drop policy if exists "Buyers and sellers can view their own reviews" on public.seller_reviews;
create policy "Buyers sellers and moderators can view reviews"
on public.seller_reviews for select to authenticated
using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or (select public.is_moderator()));

create policy "Reporters and moderators can read moderation reports"
on public.moderation_reports for select to authenticated
using (reporter_id = (select auth.uid()) or (select public.is_moderator()));

create policy "Users and moderators can read moderation warnings"
on public.moderation_warnings for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_moderator()));

create policy "Moderators can read moderation audit"
on public.moderation_actions for select to authenticated
using ((select public.is_moderator()));

create or replace function public.create_moderation_report(
  p_target_type text,
  p_target_id uuid,
  p_category text,
  p_description text
)
returns public.moderation_reports
language plpgsql
security definer set search_path = public
as $$
declare new_report public.moderation_reports;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para reportar contenido.'; end if;
  if p_target_type not in ('product', 'review') then raise exception 'El tipo de contenido no es válido.'; end if;
  if char_length(trim(p_category)) not between 3 and 60 then raise exception 'Selecciona una categoría válida.'; end if;
  if char_length(trim(p_description)) not between 10 and 1000 then raise exception 'Describe el motivo con al menos 10 caracteres.'; end if;
  if p_target_type = 'product' and not exists (select 1 from public.products where id = p_target_id) then raise exception 'La publicación ya no existe.'; end if;
  if p_target_type = 'review' and not exists (select 1 from public.seller_reviews where id = p_target_id) then raise exception 'El comentario ya no existe.'; end if;
  insert into public.moderation_reports (reporter_id, target_type, target_id, category, description)
  values (auth.uid(), p_target_type, p_target_id, trim(p_category), trim(p_description))
  returning * into new_report;
  return new_report;
end;
$$;

create or replace function public.moderate_product_action(
  p_product_id uuid,
  p_action text,
  p_reason text,
  p_duration_hours integer default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'No tienes permiso para moderar publicaciones.'; end if;
  if char_length(trim(p_reason)) not between 10 and 1000 then raise exception 'Indica un motivo de entre 10 y 1000 caracteres.'; end if;
  if p_action = 'hide' then
    update public.products set moderation_status = 'hidden', suspended_until = null where id = p_product_id;
  elsif p_action = 'delete' then
    update public.products set moderation_status = 'deleted', suspended_until = null where id = p_product_id;
  elsif p_action = 'suspend' then
    if p_duration_hours is null or p_duration_hours not between 1 and 720 then raise exception 'La suspensión debe durar entre 1 y 720 horas.'; end if;
    update public.products set moderation_status = 'suspended', suspended_until = now() + make_interval(hours => p_duration_hours) where id = p_product_id;
  else
    raise exception 'Acción de moderación no válida.';
  end if;
  if not found then raise exception 'No se encontró la publicación.'; end if;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'product', p_product_id, p_action, trim(p_reason), jsonb_build_object('duration_hours', p_duration_hours));
end;
$$;

create or replace function public.moderate_review_action(
  p_review_id uuid,
  p_action text,
  p_reason text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_moderator() then raise exception 'No tienes permiso para moderar comentarios.'; end if;
  if p_action is null or p_action not in ('hide', 'delete') then raise exception 'Acción de moderación no válida.'; end if;
  if char_length(trim(p_reason)) not between 10 and 1000 then raise exception 'Indica un motivo de entre 10 y 1000 caracteres.'; end if;
  update public.seller_reviews set moderation_status = case when p_action = 'delete' then 'deleted' else 'hidden' end where id = p_review_id;
  if not found then raise exception 'No se encontró el comentario.'; end if;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'review', p_review_id, p_action, trim(p_reason));
end;
$$;

create or replace function public.send_moderation_warning(p_user_id uuid, p_reason text)
returns public.moderation_warnings
language plpgsql
security definer set search_path = public
as $$
declare new_warning public.moderation_warnings;
begin
  if not public.is_moderator() then raise exception 'No tienes permiso para enviar advertencias.'; end if;
  if char_length(trim(p_reason)) not between 10 and 1000 then raise exception 'Indica un motivo de entre 10 y 1000 caracteres.'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role::text = 'user') then raise exception 'Solo se puede advertir a cuentas de usuario.'; end if;
  insert into public.moderation_warnings (user_id, moderator_id, reason)
  values (p_user_id, auth.uid(), trim(p_reason)) returning * into new_warning;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'user', p_user_id, 'warning', trim(p_reason));
  return new_warning;
end;
$$;

create or replace function public.manage_moderation_report(p_report_id uuid, p_action text, p_note text default '')
returns void
language plpgsql
security definer set search_path = public
as $$
declare current_status text;
begin
  if not public.is_moderator() then raise exception 'No tienes permiso para gestionar reportes.'; end if;
  select status into current_status from public.moderation_reports where id = p_report_id for update;
  if not found then raise exception 'No se encontró el reporte.'; end if;
  if p_action = 'review' and current_status in ('open', 'in_review') then
    update public.moderation_reports set status = 'in_review', updated_at = now() where id = p_report_id;
  elsif p_action = 'escalate' and current_status in ('open', 'in_review') then
    update public.moderation_reports set status = 'escalated', updated_at = now() where id = p_report_id;
  elsif p_action = 'resolve' and public.is_admin() then
    update public.moderation_reports set status = 'resolved', resolution_note = nullif(trim(p_note), ''), updated_at = now() where id = p_report_id;
  else
    raise exception 'No puedes realizar esta acción sobre el estado actual del reporte.';
  end if;
  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'report', p_report_id, p_action, coalesce(nullif(trim(p_note), ''), 'Sin nota adicional.'));
end;
$$;

create or replace function public.get_seller_profile(p_seller_id uuid)
returns table (seller_id uuid, full_name text, average_rating numeric, review_count bigint, sold_count bigint)
language sql security definer set search_path = public
as $$
  select p.id,
         coalesce(nullif(p.full_name, ''), 'Vendedor de Marketplace Arqui'),
         coalesce(round(avg(r.rating)::numeric, 1), 0),
         count(r.id),
         (select count(*) from public.products sold_products where sold_products.seller_id = p.id and sold_products.status = 'sold')
  from public.profiles p
  left join public.seller_reviews r on r.seller_id = p.id and r.moderation_status = 'active'
  where p.id = p_seller_id
  group by p.id, p.full_name;
$$;

drop function public.get_seller_reviews(uuid);
create function public.get_seller_reviews(p_seller_id uuid)
returns table (review_id uuid, rating smallint, comment text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select id, rating, comment, created_at
  from public.seller_reviews
  where seller_id = p_seller_id and moderation_status = 'active'
  order by created_at desc;
$$;

revoke all on function public.create_moderation_report(text, uuid, text, text) from public, anon;
revoke all on function public.moderate_product_action(uuid, text, text, integer) from public, anon;
revoke all on function public.moderate_review_action(uuid, text, text) from public, anon;
revoke all on function public.send_moderation_warning(uuid, text) from public, anon;
revoke all on function public.manage_moderation_report(uuid, text, text) from public, anon;
revoke all on function public.get_seller_profile(uuid) from public, anon;
revoke all on function public.get_seller_reviews(uuid) from public, anon;

grant execute on function public.create_moderation_report(text, uuid, text, text) to authenticated;
grant execute on function public.moderate_product_action(uuid, text, text, integer) to authenticated;
grant execute on function public.moderate_review_action(uuid, text, text) to authenticated;
grant execute on function public.send_moderation_warning(uuid, text) to authenticated;
grant execute on function public.manage_moderation_report(uuid, text, text) to authenticated;
grant execute on function public.get_seller_profile(uuid) to anon, authenticated;
grant execute on function public.get_seller_reviews(uuid) to anon, authenticated;

-- Asignación manual por el Superadministrador desde Supabase SQL Editor:
-- update public.profiles set role = 'moderator' where email = 'correo@ejemplo.com';