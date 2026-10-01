create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role::text = 'moderator'
  );
$$;

grant execute on function public.is_moderator() to anon, authenticated;

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
on public.products for select
using (
  ((select auth.uid()) is null or not (select public.is_admin()))
  and (status = 'published' or (select auth.uid()) = seller_id)
  or (select public.is_moderator())
);

drop policy if exists "Users can create their own products" on public.products;
create policy "Users can create their own products"
on public.products for insert to authenticated
with check ((select auth.uid()) = seller_id and not (select public.is_admin()));

drop policy if exists "Owners and administrators can update products" on public.products;
create policy "Owners can update their products"
on public.products for update to authenticated
using ((select auth.uid()) = seller_id and not (select public.is_admin()))
with check ((select auth.uid()) = seller_id and not (select public.is_admin()));

drop policy if exists "Owners and administrators can delete products" on public.products;
create policy "Owners can delete their products"
on public.products for delete to authenticated
using ((select auth.uid()) = seller_id and not (select public.is_admin()));

drop policy if exists "Product images are visible with published products" on public.product_images;
create policy "Product images are visible with published products"
on public.product_images for select
using (
  ((select auth.uid()) is null or not (select public.is_admin()))
  and exists (
    select 1 from public.products product
    where product.id = product_id
      and (product.status = 'published' or product.seller_id = (select auth.uid()))
  )
  or (select public.is_moderator())
);

drop policy if exists "Sellers can attach their own uploaded images" on public.product_images;
create policy "Sellers can attach their own uploaded images"
on public.product_images for insert to authenticated
with check (
  not (select public.is_admin())
  and exists (
    select 1 from public.products product
    where product.id = product_id and product.seller_id = (select auth.uid())
  )
  and storage_path like ((select auth.uid())::text || '/%')
);

drop policy if exists "Sellers and administrators can remove product images" on public.product_images;
create policy "Sellers can remove their product images"
on public.product_images for delete to authenticated
using (
  not (select public.is_admin())
  and exists (
    select 1 from public.products product
    where product.id = product_id and product.seller_id = (select auth.uid())
  )
);

drop policy if exists "Administrators can delete any product photo" on storage.objects;
drop policy if exists "Users can upload product photos to their own folder" on storage.objects;
create policy "Users can upload product photos to their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and not (select public.is_admin())
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Users can delete product photos from their own folder" on storage.objects;
create policy "Users can delete product photos from their own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and not (select public.is_admin())
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "Buyers and sellers can view their own orders" on public.orders;
create policy "Buyers and sellers can view their own orders"
on public.orders for select to authenticated
using (
  not (select public.is_admin())
  and (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()))
);

drop policy if exists "Sellers can manage their bank details" on public.seller_bank_details;
create policy "Sellers can manage their bank details"
on public.seller_bank_details for all to authenticated
using (seller_id = (select auth.uid()) and not (select public.is_admin()))
with check (seller_id = (select auth.uid()) and not (select public.is_admin()));

drop policy if exists "Buyers can view seller details for their own orders" on public.seller_bank_details;
create policy "Buyers can view seller details for their own orders"
on public.seller_bank_details for select to authenticated
using (
  not (select public.is_admin())
  and exists (
    select 1 from public.orders
    where orders.seller_id = seller_bank_details.seller_id
      and orders.buyer_id = (select auth.uid())
  )
);

drop policy if exists "Buyers and administrators can view payment proofs" on storage.objects;
create policy "Buyers can view their payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and not (select public.is_admin())
  and exists (
    select 1 from public.orders
    where orders.proof_path = storage.objects.name
      and orders.buyer_id = (select auth.uid())
  )
);

drop policy if exists "Buyers can upload their payment proofs" on storage.objects;
create policy "Buyers can upload their payment proofs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and not (select public.is_admin())
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Buyers can remove their pending payment proofs" on storage.objects;
create policy "Buyers can remove their pending payment proofs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and not (select public.is_admin())
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Sellers can view payment proofs for their sales" on storage.objects;
create policy "Sellers can view payment proofs for their sales"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and not (select public.is_admin())
  and exists (
    select 1 from public.orders
    where orders.proof_path = storage.objects.name
      and orders.seller_id = (select auth.uid())
  )
);

drop policy if exists "Buyers sellers and moderators can view reviews" on public.seller_reviews;
create policy "Buyers sellers and moderators can view reviews"
on public.seller_reviews for select to authenticated
using (
  (not (select public.is_admin()) and (buyer_id = (select auth.uid()) or seller_id = (select auth.uid())))
  or (select public.is_moderator())
);

drop policy if exists "Reporters and moderators can read moderation reports" on public.moderation_reports;
create policy "Reporters and moderators can read moderation reports"
on public.moderation_reports for select to authenticated
using (
  (not (select public.is_admin()) and reporter_id = (select auth.uid()))
  or (select public.is_moderator())
);

drop policy if exists "Users and moderators can read moderation warnings" on public.moderation_warnings;
create policy "Users and moderators can read moderation warnings"
on public.moderation_warnings for select to authenticated
using (
  (not (select public.is_admin()) and user_id = (select auth.uid()))
  or (select public.is_moderator())
);

create or replace function public.create_marketplace_order(p_product_id uuid)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare selected_product public.products; existing_order public.orders; new_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para comprar.'; end if;
  if public.is_admin() then raise exception 'Las cuentas Superadministrador no pueden comprar.'; end if;
  select * into selected_product from public.products where id = p_product_id and status = 'published';
  if not found then raise exception 'Este producto ya no está disponible.'; end if;
  if selected_product.seller_id = auth.uid() then raise exception 'No puedes comprar tu propia publicación.'; end if;
  if not exists (select 1 from public.seller_bank_details where seller_id = selected_product.seller_id) then raise exception 'El vendedor aún no ha registrado sus datos bancarios.'; end if;
  select * into existing_order from public.orders where product_id = p_product_id;
  if found then
    if existing_order.buyer_id = auth.uid() then return existing_order; end if;
    raise exception 'Este producto ya tiene una compra en proceso.';
  end if;
  insert into public.orders (product_id, buyer_id, seller_id, amount_cents)
  values (selected_product.id, auth.uid(), selected_product.seller_id, selected_product.price_cents)
  returning * into new_order;
  return new_order;
end;
$$;

create or replace function public.submit_payment_proof(p_order_id uuid, p_proof_path text)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare updated_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if public.is_admin() then raise exception 'Las cuentas Superadministrador no pueden gestionar pagos.'; end if;
  if p_proof_path not like auth.uid()::text || '/' || p_order_id::text || '/%' then raise exception 'La ubicación del comprobante no es válida.'; end if;
  update public.orders
  set proof_path = p_proof_path, status = 'proof_submitted', verification_note = 'Comprobante enviado. Esperando revisión del vendedor.', verified_at = null
  where id = p_order_id and buyer_id = auth.uid() and status in ('pending_transfer', 'rejected_by_seller')
  returning * into updated_order;
  if not found then raise exception 'No se pudo enviar este comprobante.'; end if;
  return updated_order;
end;
$$;

create or replace function public.review_payment_proof(p_order_id uuid, p_is_approved boolean)
returns public.orders
language plpgsql
security definer set search_path = public
as $$
declare updated_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if public.is_admin() then raise exception 'Las cuentas Superadministrador no pueden revisar pagos.'; end if;
  update public.orders
  set status = case when p_is_approved then 'verified_by_seller' else 'rejected_by_seller' end,
      verification_note = case when p_is_approved then 'Comprobante aprobado por el vendedor.' else 'Comprobante rechazado por el vendedor. El comprador puede enviar uno nuevo.' end,
      verified_at = case when p_is_approved then now() else null end
  where id = p_order_id and seller_id = auth.uid() and status = 'proof_submitted'
  returning * into updated_order;
  if not found then raise exception 'No tienes un comprobante pendiente para este pedido.'; end if;
  return updated_order;
end;
$$;

create or replace function public.create_seller_review(p_order_id uuid, p_rating smallint, p_comment text)
returns public.seller_reviews
language plpgsql
security definer set search_path = public
as $$
declare selected_order public.orders; new_review public.seller_reviews;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if public.is_admin() then raise exception 'Las cuentas Superadministrador no pueden publicar comentarios.'; end if;
  if p_rating not between 1 and 5 then raise exception 'La calificación debe estar entre 1 y 5.'; end if;
  if char_length(trim(p_comment)) < 3 then raise exception 'Escribe un comentario de al menos 3 caracteres.'; end if;
  select * into selected_order from public.orders where id = p_order_id and buyer_id = auth.uid() and status = 'verified_by_seller';
  if not found then raise exception 'Solo puedes calificar una compra aprobada.'; end if;
  insert into public.seller_reviews (order_id, seller_id, buyer_id, rating, comment)
  values (selected_order.id, selected_order.seller_id, auth.uid(), p_rating, trim(p_comment)) returning * into new_review;
  return new_review;
exception when unique_violation then raise exception 'Ya calificaste esta compra.';
end;
$$;

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
  if public.is_admin() then raise exception 'Las cuentas Superadministrador no pueden reportar contenido.'; end if;
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
  where p.id = p_seller_id and not public.is_admin()
  group by p.id, p.full_name;
$$;

drop function public.get_seller_reviews(uuid);
create function public.get_seller_reviews(p_seller_id uuid)
returns table (review_id uuid, rating smallint, comment text, created_at timestamptz)
language sql security definer set search_path = public
as $$
  select id, rating, comment, created_at
  from public.seller_reviews
  where seller_id = p_seller_id and moderation_status = 'active' and not public.is_admin()
  order by created_at desc;
$$;

grant execute on function public.create_marketplace_order(uuid) to authenticated;
grant execute on function public.submit_payment_proof(uuid, text) to authenticated;
grant execute on function public.review_payment_proof(uuid, boolean) to authenticated;
grant execute on function public.create_seller_review(uuid, smallint, text) to authenticated;
grant execute on function public.create_moderation_report(text, uuid, text, text) to authenticated;
grant execute on function public.get_seller_profile(uuid) to anon, authenticated;
grant execute on function public.get_seller_reviews(uuid) to anon, authenticated;