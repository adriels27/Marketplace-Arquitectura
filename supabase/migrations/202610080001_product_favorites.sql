-- Lista de favoritos privada por usuario.
begin;

create table public.product_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.product_favorites enable row level security;
create policy "Users manage their own favorites" on public.product_favorites for all to authenticated
using (user_id = (select auth.uid()) and (select public.is_active_account()))
with check (user_id = (select auth.uid()) and (select public.is_active_account()));
grant select, insert, delete on public.product_favorites to authenticated;

commit;
