-- Datos de registro y vista administrativa de usuarios.
alter table public.profiles
  add column if not exists birth_date date;

-- Los nuevos registros creados desde Supabase Auth guardan el nombre y fecha
-- proporcionados en el formulario de Marketplace Arqui.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, birth_date)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date
  );
  return new;
end;
$$;

-- La política existente "Administrators can view all profiles" permite al
-- administrador consultar estos datos; los usuarios comunes solo ven su perfil.
