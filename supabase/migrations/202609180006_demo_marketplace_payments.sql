-- Pagos de demostración para Marketplace Arqui.
-- Este módulo NO se conecta a Banco Pichincha ni confirma movimientos reales.

create type public.marketplace_payment_status as enum ('pending_transfer', 'verified_demo', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('MA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  product_id uuid not null unique references public.products(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  status public.marketplace_payment_status not null default 'pending_transfer',
  proof_path text,
  verification_note text,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.orders enable row level security;
create policy "Buyers and sellers can view their own orders" on public.orders for select to authenticated using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or (select public.is_admin()));

-- Los pedidos se crean únicamente mediante la función protegida de abajo.
create function public.create_marketplace_order(p_product_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare selected_product public.products; existing_order public.orders; new_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para comprar.'; end if;
  select * into selected_product from public.products where id = p_product_id and status = 'published';
  if not found then raise exception 'Este producto ya no está disponible.'; end if;
  if selected_product.seller_id = auth.uid() then raise exception 'No puedes comprar tu propia publicación.'; end if;
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

create function public.submit_demo_payment_proof(p_order_id uuid, p_proof_path text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare updated_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_proof_path not like auth.uid()::text || '/' || p_order_id::text || '/%' then raise exception 'La ubicación del comprobante no es válida.'; end if;
  update public.orders set proof_path = p_proof_path, status = 'verified_demo', verification_note = 'Verificación simulada para la demostración académica.', verified_at = now()
  where id = p_order_id and buyer_id = auth.uid() and status = 'pending_transfer' returning * into updated_order;
  if not found then raise exception 'No se pudo verificar este pago.'; end if;
  return updated_order;
end;
$$;

grant execute on function public.create_marketplace_order(uuid) to authenticated;
grant execute on function public.submit_demo_payment_proof(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']) on conflict (id) do nothing;

create policy "Buyers can upload their payment proofs" on storage.objects for insert to authenticated with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Buyers and administrators can view payment proofs" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and exists (select 1 from public.orders where orders.proof_path = storage.objects.name and (orders.buyer_id = (select auth.uid()) or (select public.is_admin()))));
create policy "Buyers can remove their pending payment proofs" on storage.objects for delete to authenticated using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid()::text));
