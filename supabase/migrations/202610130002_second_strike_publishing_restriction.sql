alter table public.moderation_warnings
  add column strike_number smallint check (strike_number > 0);

with numbered_strikes as (
  select id, row_number() over (partition by user_id order by created_at, id)::smallint as strike_number
  from public.moderation_warnings
  where product_id is not null
)
update public.moderation_warnings warning
set strike_number = numbered_strikes.strike_number
from numbered_strikes
where warning.id = numbered_strikes.id;

create or replace function public.can_publish_products()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.deleted_at is null
      and profile.disabled_at is null
      and (
        profile.role::text in ('admin', 'moderator')
        or (
          profile.role::text = 'user'
          and not exists (
            select 1
            from public.moderation_warnings warning
            where warning.user_id = profile.id
              and warning.strike_number >= 3
          )
          and not exists (
            select 1
            from public.moderation_warnings warning
            where warning.user_id = profile.id
              and warning.strike_number = 2
              and warning.created_at + interval '30 days' > now()
          )
        )
      )
  );
$$;

revoke all on function public.can_publish_products() from public, anon;
grant execute on function public.can_publish_products() to authenticated;

create policy "Publishing requires an eligible account"
on public.products as restrictive for insert to authenticated
with check (status <> 'published' or (select public.can_publish_products()));

create policy "Product images require an eligible account"
on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'product-images' or (select public.can_publish_products()));

create or replace function public.prevent_restricted_product_publication()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
    and new.status = 'published'
    and old.status <> 'published'
    and not public.can_publish_products()
  then
    raise exception 'La opción de publicar está deshabilitada durante tu restricción de 30 días.';
  end if;
  return new;
end;
$$;

create trigger prevent_restricted_product_publication
before update of status on public.products
for each row execute function public.prevent_restricted_product_publication();

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
declare
  target_seller_id uuid;
  target_seller_role text;
  target_product_title text;
  current_moderation_status text;
  next_strike_number integer;
begin
  if not public.is_moderator() then raise exception 'No tienes permiso para moderar publicaciones.'; end if;
  if p_action is distinct from 'delete' then raise exception 'La única acción disponible para publicaciones es eliminarlas.'; end if;
  if char_length(trim(p_reason)) not between 10 and 1000 then raise exception 'Indica un motivo de entre 10 y 1000 caracteres.'; end if;

  select seller_id, title, moderation_status
  into target_seller_id, target_product_title, current_moderation_status
  from public.products
  where id = p_product_id
  for update;
  if not found then raise exception 'No se encontró la publicación.'; end if;
  if current_moderation_status = 'deleted' then raise exception 'La publicación ya fue eliminada.'; end if;

  select role::text into target_seller_role
  from public.profiles
  where id = target_seller_id
  for update;
  if not found then raise exception 'No se encontró la cuenta de quien publicó el artículo.'; end if;

  select count(*) + 1 into next_strike_number
  from public.moderation_warnings
  where user_id = target_seller_id and product_id is not null;

  update public.products set moderation_status = 'deleted', suspended_until = null where id = p_product_id;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'product', p_product_id, 'delete', trim(p_reason), jsonb_build_object('strike_number', next_strike_number));

  insert into public.moderation_warnings (user_id, moderator_id, reason, product_id, product_title, strike_number)
  values (target_seller_id, auth.uid(), trim(p_reason), p_product_id, target_product_title, next_strike_number);

  if next_strike_number >= 3 and target_seller_role = 'user' then
    update public.profiles set disabled_at = coalesce(disabled_at, now()) where id = target_seller_id;
  end if;
end;
$$;

revoke all on function public.moderate_product_action(uuid, text, text, integer) from public, anon;
grant execute on function public.moderate_product_action(uuid, text, text, integer) to authenticated;
