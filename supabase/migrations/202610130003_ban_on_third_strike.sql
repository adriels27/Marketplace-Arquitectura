drop function public.moderate_product_action(uuid, text, text, integer);

create function public.moderate_product_action(
  p_product_id uuid,
  p_action text,
  p_reason text,
  p_duration_hours integer default null
)
returns smallint
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

  return next_strike_number::smallint;
end;
$$;

revoke all on function public.moderate_product_action(uuid, text, text, integer) from public, anon;
grant execute on function public.moderate_product_action(uuid, text, text, integer) to authenticated;
