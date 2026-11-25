create function public.save_product_edit(
  p_product_id uuid,
  p_title text,
  p_description text,
  p_price_cents integer,
  p_category text,
  p_item_condition text,
  p_location text,
  p_status public.product_status,
  p_current_image_id uuid,
  p_new_image_path text,
  p_remove_image boolean
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_image public.product_images%rowtype;
begin
  update public.products
  set title = p_title,
      description = p_description,
      price_cents = p_price_cents,
      category = p_category,
      item_condition = p_item_condition,
      location = p_location,
      status = p_status
  where id = p_product_id
    and seller_id = (select auth.uid());

  if not found then
    raise exception 'No se pudo editar esta publicación.';
  end if;

  if p_new_image_path is not null or p_remove_image then
    select * into previous_image
    from public.product_images
    where product_id = p_product_id
    order by position, created_at, id
    limit 1
    for update;

    if previous_image.id is distinct from p_current_image_id then
      raise exception 'La foto cambió. Vuelve a abrir la publicación antes de editarla.';
    end if;

    if previous_image.id is not null then
      delete from public.product_images where id = previous_image.id;
      if not found then
        raise exception 'No se pudo quitar la foto anterior.';
      end if;
    end if;

    if p_new_image_path is not null then
      insert into public.product_images (product_id, storage_path, position)
      values (p_product_id, p_new_image_path, coalesce(previous_image.position, 0));
    end if;

    return previous_image.storage_path;
  end if;

  return null;
end;
$$;

revoke execute on function public.save_product_edit(uuid, text, text, integer, text, text, text, public.product_status, uuid, text, boolean) from public, anon;
grant execute on function public.save_product_edit(uuid, text, text, integer, text, text, text, public.product_status, uuid, text, boolean) to authenticated;
