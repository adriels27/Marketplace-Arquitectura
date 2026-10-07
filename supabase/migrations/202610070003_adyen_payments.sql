-- Pago con tarjeta mediante Adyen (flujo Sessions + componente Card).
-- Reemplaza lo de Payphone: es seguro ejecutarlo aunque las migraciones de Payphone
-- no se hayan corrido o ya se hayan corrido.

alter table public.orders add column if not exists payment_method text not null default 'transfer';
alter table public.orders drop constraint if exists orders_payment_method_check;
update public.orders set payment_method = 'transfer' where payment_method not in ('transfer', 'adyen');
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('transfer', 'adyen'));

alter table public.orders
  add column if not exists adyen_reference text unique,
  add column if not exists adyen_psp_reference text unique;

-- Limpieza de Payphone (si existían).
alter table public.orders
  drop column if exists payphone_client_tx_id,
  drop column if exists payphone_transaction_id,
  drop column if exists card_brand,
  drop column if exists card_last_digits;

-- Con pago en línea el cobro entra a la cuenta del comercio (Adyen), por eso ya no se
-- exige que el vendedor tenga datos bancarios para crear el pedido.
create or replace function public.create_marketplace_order(p_product_id uuid)
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
grant execute on function public.create_marketplace_order(uuid) to authenticated;
