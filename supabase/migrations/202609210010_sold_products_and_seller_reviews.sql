-- Productos vendidos y reputación pública del vendedor.
-- El estado se vuelve texto con una lista cerrada para poder incluir "sold".
drop function if exists public.create_marketplace_order(uuid);
drop policy if exists "Published products are public" on public.products;
drop policy if exists "Product images are visible with published products" on public.product_images;
drop index if exists public.products_published_created_at_idx;
alter table public.products alter column status drop default;
alter table public.products alter column status type text using status::text;
alter table public.products alter column status set default 'draft';
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (status in ('draft', 'published', 'archived', 'sold'));
create index products_published_created_at_idx on public.products (created_at desc) where status = 'published';
create policy "Published products are public" on public.products for select using (status = 'published' or (select auth.uid()) = seller_id or (select public.is_admin()));
create policy "Product images are visible with published products"
on public.product_images for select
using (
  exists (
    select 1 from public.products product
    where product.id = product_id
      and (product.status = 'published' or product.seller_id = (select auth.uid()) or (select public.is_admin()))
  )
);

create table public.seller_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 1000),
  created_at timestamptz not null default now()
);

alter table public.seller_reviews enable row level security;
create policy "Buyers and sellers can view their own reviews" on public.seller_reviews for select to authenticated
using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.create_marketplace_order(p_product_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare selected_product public.products; existing_order public.orders; new_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para comprar.'; end if;
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
grant execute on function public.create_marketplace_order(uuid) to authenticated;

create or replace function public.mark_product_as_sold()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'verified_by_seller' and old.status is distinct from 'verified_by_seller' then
    update public.products set status = 'sold' where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists mark_product_as_sold_after_payment on public.orders;
create trigger mark_product_as_sold_after_payment
after update of status on public.orders
for each row execute procedure public.mark_product_as_sold();

-- También actualiza pedidos que fueron aprobados antes de instalar esta migración.
update public.products
set status = 'sold'
where id in (select product_id from public.orders where status = 'verified_by_seller');

create function public.create_seller_review(p_order_id uuid, p_rating smallint, p_comment text)
returns public.seller_reviews language plpgsql security definer set search_path = public as $$
declare selected_order public.orders; new_review public.seller_reviews;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
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
grant execute on function public.create_seller_review(uuid, smallint, text) to authenticated;

-- Estas funciones exponen únicamente nombre, calificaciones y comentarios,
-- nunca correo, fecha de nacimiento ni datos bancarios del vendedor.
create function public.get_seller_profile(p_seller_id uuid)
returns table (seller_id uuid, full_name text, average_rating numeric, review_count bigint, sold_count bigint)
language sql security definer set search_path = public as $$
  select p.id,
         coalesce(nullif(p.full_name, ''), 'Vendedor de Marketplace Arqui'),
         coalesce(round(avg(r.rating)::numeric, 1), 0),
         count(r.id),
         (select count(*) from public.products sold_products where sold_products.seller_id = p.id and sold_products.status = 'sold')
  from public.profiles p
  left join public.seller_reviews r on r.seller_id = p.id
  where p.id = p_seller_id
  group by p.id, p.full_name;
$$;

create function public.get_seller_reviews(p_seller_id uuid)
returns table (rating smallint, comment text, created_at timestamptz)
language sql security definer set search_path = public as $$
  select rating, comment, created_at
  from public.seller_reviews
  where seller_id = p_seller_id
  order by created_at desc;
$$;

grant execute on function public.get_seller_profile(uuid) to anon, authenticated;
grant execute on function public.get_seller_reviews(uuid) to anon, authenticated;
