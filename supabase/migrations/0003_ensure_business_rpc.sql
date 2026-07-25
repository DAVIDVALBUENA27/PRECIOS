-- Auto-blindaje: cuentas creadas ANTES del trigger on_auth_user_created
-- no tienen business/profile. Esta función crea ambos on-demand (idempotente)
-- y devuelve el business_id del usuario actual.
create or replace function public.ensure_current_business()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  bid uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select business_id into bid from public.profiles where id = auth.uid();
  if bid is not null then
    return bid;
  end if;

  insert into public.businesses (name)
  values (coalesce(
    (select raw_user_meta_data->>'business_name' from auth.users where id = auth.uid()),
    'Mi Negocio'
  ))
  returning id into bid;

  insert into public.profiles (id, business_id, email, full_name)
  values (
    auth.uid(),
    bid,
    coalesce((select email from auth.users where id = auth.uid()), ''),
    (select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid())
  )
  on conflict (id) do update set business_id = excluded.business_id
  returning business_id into bid;

  return bid;
end;
$$;

grant execute on function public.ensure_current_business() to authenticated;
