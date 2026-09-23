-- Solo mayores de 18 años pueden crear una cuenta.
-- La validación se realiza también en la base de datos para que no pueda omitirse desde el navegador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  entered_birth_date date;
begin
  begin
    entered_birth_date := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    raise exception 'La fecha de nacimiento no es válida.';
  end;

  if entered_birth_date is null or entered_birth_date > (current_date - interval '18 years')::date then
    raise exception 'Debes tener al menos 18 años para crear una cuenta.';
  end if;

  insert into public.profiles (id, email, full_name, birth_date)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    entered_birth_date
  );
  return new;
end;
$$;
