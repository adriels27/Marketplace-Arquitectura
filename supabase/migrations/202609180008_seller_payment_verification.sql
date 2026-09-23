-- El vendedor recibe el pago directamente y revisa el comprobante.
-- Se usa texto con una lista cerrada de estados para poder ampliar el flujo
-- sin depender de cambios de enum entre migraciones.
drop function if exists public.submit_demo_payment_proof(uuid, text);
alter table public.orders alter column status drop default;
alter table public.orders alter column status type text using status::text;
alter table public.orders alter column status set default 'pending_transfer';
alter table public.orders add constraint orders_status_check check (status in ('pending_transfer', 'proof_submitted', 'verified_by_seller', 'rejected_by_seller', 'verified_demo', 'cancelled'));

create table public.seller_bank_details (
  seller_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  bank_name text not null check (char_length(bank_name) between 2 and 80),
  account_number text not null check (char_length(account_number) between 4 and 40),
  account_email text not null check (char_length(account_email) between 5 and 255),
  national_id text not null check (char_length(national_id) between 6 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_seller_bank_details_updated_at before update on public.seller_bank_details
for each row execute procedure public.set_updated_at();

alter table public.seller_bank_details enable row level security;
create policy "Sellers can manage their bank details" on public.seller_bank_details for all to authenticated
using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "Buyers can view seller details for their own orders" on public.seller_bank_details for select to authenticated
using (exists (select 1 from public.orders where orders.seller_id = seller_bank_details.seller_id and orders.buyer_id = (select auth.uid())));

create or replace function public.create_marketplace_order(p_product_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare selected_product public.products; existing_order public.orders; new_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión para comprar.'; end if;
  select * into selected_product from public.products where id = p_product_id and status = 'published';
  if not found then raise exception 'Este producto ya no está disponible.'; end if;
  if selected_product.seller_id = auth.uid() then raise exception 'No puedes comprar tu propia publicación.'; end if;
  if not exists (select 1 from public.seller_bank_details where seller_id = selected_product.seller_id) then
    raise exception 'El vendedor aún no ha registrado sus datos bancarios.';
  end if;
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
returns public.orders language plpgsql security definer set search_path = public as $$
declare updated_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_proof_path not like auth.uid()::text || '/' || p_order_id::text || '/%' then raise exception 'La ubicación del comprobante no es válida.'; end if;
  update public.orders
  set proof_path = p_proof_path, status = 'proof_submitted', verification_note = 'Comprobante enviado. Esperando revisión del vendedor.', verified_at = null
  where id = p_order_id and buyer_id = auth.uid() and status in ('pending_transfer', 'rejected_by_seller')
  returning * into updated_order;
  if not found then raise exception 'No se pudo enviar este comprobante.'; end if;
  return updated_order;
end;
$$;

create function public.review_payment_proof(p_order_id uuid, p_is_approved boolean)
returns public.orders language plpgsql security definer set search_path = public as $$
declare updated_order public.orders;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
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

grant execute on function public.submit_payment_proof(uuid, text) to authenticated;
grant execute on function public.review_payment_proof(uuid, boolean) to authenticated;

create policy "Sellers can view payment proofs for their sales" on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and exists (select 1 from public.orders where orders.proof_path = storage.objects.name and orders.seller_id = (select auth.uid())));
