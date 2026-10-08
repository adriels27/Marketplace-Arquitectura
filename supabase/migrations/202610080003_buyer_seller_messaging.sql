-- Conversaciones privadas y mensajes entre comprador y vendedor.
begin;

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, buyer_id),
  check (buyer_id <> seller_id)
);
create index conversations_buyer_updated_idx on public.conversations (buyer_id, updated_at desc);
create index conversations_seller_updated_idx on public.conversations (seller_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
create policy "Participants can view conversations" on public.conversations for select to authenticated
using ((buyer_id = (select auth.uid()) or seller_id = (select auth.uid())) and (select public.is_active_account()));
create policy "Participants can read messages" on public.messages for select to authenticated
using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))) and (select public.is_active_account()));
grant select on public.conversations, public.messages to authenticated;

create function public.start_product_conversation(p_product_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare selected_product public.products; conversation_id uuid;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Debes iniciar sesión con una cuenta activa.'; end if;
  if public.is_admin() then raise exception 'Esta cuenta no puede iniciar conversaciones.'; end if;
  select * into selected_product from public.products
  where id = p_product_id and status = 'published'
    and (moderation_status = 'active' or (moderation_status = 'suspended' and suspended_until <= now()));
  if not found then raise exception 'Esta publicación no está disponible.'; end if;
  if selected_product.seller_id = auth.uid() then raise exception 'No puedes escribirte a ti mismo.'; end if;
  insert into public.conversations (product_id, buyer_id, seller_id)
  values (selected_product.id, auth.uid(), selected_product.seller_id)
  on conflict (product_id, buyer_id) do update set updated_at = now()
  returning id into conversation_id;
  return conversation_id;
end;
$$;

create function public.send_conversation_message(p_conversation_id uuid, p_body text)
returns public.messages language plpgsql security definer set search_path = '' as $$
declare new_message public.messages;
begin
  if auth.uid() is null or not public.is_active_account() then raise exception 'Debes iniciar sesión con una cuenta activa.'; end if;
  if char_length(trim(p_body)) not between 1 and 2000 then raise exception 'El mensaje debe tener entre 1 y 2000 caracteres.'; end if;
  if not exists (select 1 from public.conversations where id = p_conversation_id and (buyer_id = auth.uid() or seller_id = auth.uid())) then raise exception 'No tienes acceso a esta conversación.'; end if;
  insert into public.messages (conversation_id, sender_id, body) values (p_conversation_id, auth.uid(), trim(p_body)) returning * into new_message;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return new_message;
end;
$$;
grant execute on function public.start_product_conversation(uuid) to authenticated;
grant execute on function public.send_conversation_message(uuid, text) to authenticated;
revoke execute on function public.start_product_conversation(uuid) from public, anon;
revoke execute on function public.send_conversation_message(uuid, text) from public, anon;

create function public.get_conversation_context(p_conversation_id uuid)
returns table (product_id uuid, product_title text, peer_name text, peer_avatar_url text)
language sql security definer set search_path = '' as $$
  select c.product_id, p.title,
         coalesce(nullif(peer.full_name, ''), 'Usuario de Marketplace Arqui'), peer.avatar_url
  from public.conversations c
  join public.products p on p.id = c.product_id
  join public.profiles peer on peer.id = case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end
  where c.id = p_conversation_id and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    and peer.deleted_at is null and peer.disabled_at is null;
$$;
grant execute on function public.get_conversation_context(uuid) to authenticated;
revoke execute on function public.get_conversation_context(uuid) from public, anon;

commit;
