-- Ejecuta este archivo en Supabase > SQL Editor una vez creado tu proyecto.
-- La aplicación nunca utiliza una clave secreta para estas operaciones.

create type public.user_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Crea automáticamente el perfil de cada cuenta nueva. El rol siempre comienza como user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Esta función evita depender de datos enviados por el navegador para reconocer un administrador.
create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Administrators can view all profiles"
on public.profiles for select to authenticated
using ((select public.is_admin()));

-- No hay política de escritura directa: nadie puede asignarse el rol admin desde el navegador.
-- El primer administrador se asigna desde el SQL Editor, después de crear su cuenta:
-- update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
