-- Productos del marketplace. Ejecuta esta migración en Supabase > SQL Editor.

create type public.product_status as enum ('draft', 'published', 'archived');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 3000),
  price_cents integer not null check (price_cents > 0),
  category text not null check (char_length(category) between 2 and 50),
  item_condition text not null check (char_length(item_condition) between 2 and 50),
  location text not null check (char_length(location) between 2 and 100),
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_seller_id_idx on public.products (seller_id);
create index products_published_created_at_idx on public.products (created_at desc) where status = 'published';

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

alter table public.products enable row level security;

-- Cualquier visitante puede leer publicaciones visibles. El dueño y los administradores
-- también pueden ver borradores y archivados.
create policy "Published products are public"
on public.products for select
using (
  status = 'published'
  or (select auth.uid()) = seller_id
  or (select public.is_admin())
);

create policy "Users can create their own products"
on public.products for insert to authenticated
with check ((select auth.uid()) = seller_id);

create policy "Owners and administrators can update products"
on public.products for update to authenticated
using ((select auth.uid()) = seller_id or (select public.is_admin()))
with check ((select auth.uid()) = seller_id or (select public.is_admin()));

create policy "Owners and administrators can delete products"
on public.products for delete to authenticated
using ((select auth.uid()) = seller_id or (select public.is_admin()));
