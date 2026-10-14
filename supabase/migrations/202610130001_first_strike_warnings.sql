alter table public.moderation_warnings
  add column product_id uuid references public.products(id) on delete set null,
  add column product_title text;

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
  target_product_title text;
  current_moderation_status text;
begin
  if not public.is_moderator() then raise exception 'No tienes permiso para moderar publicaciones.'; end if;
  if char_length(trim(p_reason)) not between 10 and 1000 then raise exception 'Indica un motivo de entre 10 y 1000 caracteres.'; end if;

  select seller_id, title, moderation_status
  into target_seller_id, target_product_title, current_moderation_status
  from public.products
  where id = p_product_id
  for update;
  if not found then raise exception 'No se encontró la publicación.'; end if;

  if p_action = 'hide' then
    update public.products set moderation_status = 'hidden', suspended_until = null where id = p_product_id;
  elsif p_action = 'delete' then
    if current_moderation_status = 'deleted' then raise exception 'La publicación ya fue eliminada.'; end if;
    update public.products set moderation_status = 'deleted', suspended_until = null where id = p_product_id;
  elsif p_action = 'suspend' then
    if p_duration_hours is null or p_duration_hours not between 1 and 720 then raise exception 'La suspensión debe durar entre 1 y 720 horas.'; end if;
    update public.products set moderation_status = 'suspended', suspended_until = now() + make_interval(hours => p_duration_hours) where id = p_product_id;
  else
    raise exception 'Acción de moderación no válida.';
  end if;

  insert into public.moderation_actions (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'product', p_product_id, p_action, trim(p_reason), jsonb_build_object('duration_hours', p_duration_hours));

  if p_action = 'delete' then
    insert into public.moderation_warnings (user_id, moderator_id, reason, product_id, product_title)
    values (target_seller_id, auth.uid(), trim(p_reason), p_product_id, target_product_title);
  end if;
end;
$$;
