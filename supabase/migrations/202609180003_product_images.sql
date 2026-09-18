-- Fotos de productos. Ejecuta esta migración después de 202609180002_products.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0 check (position between 0 and 10),
  created_at timestamptz not null default now()
);

create index product_images_product_id_position_idx on public.product_images (product_id, position);

alter table public.product_images enable row level security;

create policy "Product images are visible with published products"
on public.product_images for select
using (
  exists (
    select 1 from public.products product
    where product.id = product_id
      and (
        product.status = 'published'
        or product.seller_id = (select auth.uid())
        or (select public.is_admin())
      )
  )
);

create policy "Sellers can attach their own uploaded images"
on public.product_images for insert to authenticated
with check (
  exists (
    select 1 from public.products product
    where product.id = product_id
      and (product.seller_id = (select auth.uid()) or (select public.is_admin()))
  )
  and (
    storage_path like ((select auth.uid())::text || '/%')
    or (select public.is_admin())
  )
);

create policy "Sellers and administrators can remove product images"
on public.product_images for delete to authenticated
using (
  exists (
    select 1 from public.products product
    where product.id = product_id
      and (product.seller_id = (select auth.uid()) or (select public.is_admin()))
  )
);

-- Los productos son públicos, pero cada usuario solo puede subir o borrar
-- archivos dentro de su propia carpeta identificada por su UUID.
create policy "Users can upload product photos to their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);

create policy "Users can delete product photos from their own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub')
);
