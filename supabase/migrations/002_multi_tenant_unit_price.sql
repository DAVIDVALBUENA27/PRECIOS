-- ============================================================
-- 1) NEGOCIOS (tenants)
-- ============================================================
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_url    text,                      -- URL pública en Supabase Storage (bucket 'logos')
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 2) PROFILES (1 usuario = 1 negocio en v2. Deja espacio para
--    multi-usuario por negocio más adelante sin romper el esquema:
--    basta con quitar el UNIQUE de auth.users.id -> profiles.id
--    y mover a una tabla puente business_members si algún día
--    un negocio necesita varios logins).
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now()
);

create index idx_profiles_business on public.profiles(business_id);

-- Trigger: al registrarse, crea el negocio (nombre viene del signup)
-- y el profile que lo vincula. Sigue el patrón exacto de add-login.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_business_id uuid;
begin
  insert into public.businesses (name)
  values (coalesce(new.raw_user_meta_data->>'business_name', 'Mi Negocio'))
  returning id into new_business_id;

  insert into public.profiles (id, business_id, email, full_name)
  values (new.id, new_business_id, new.email, new.raw_user_meta_data->>'full_name');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;

create policy "usuarios ven su propio negocio"
  on public.businesses for select
  using (id = (select business_id from public.profiles where id = auth.uid()));

create policy "usuarios actualizan su propio negocio"
  on public.businesses for update
  using (id = (select business_id from public.profiles where id = auth.uid()));

create policy "usuarios ven su propio profile"
  on public.profiles for select
  using (id = auth.uid());

-- ============================================================
-- 3) PRODUCTOS (estado actual) — ahora scoped por business_id
-- ============================================================
create table public.products (
  id           bigserial primary key,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  sku          text not null,
  name         text not null,
  price        numeric(12,2),
  lab          text default 'Sin laboratorio',
  content_raw  text,                 -- texto tal cual vino del Excel, ej "500 GR"
  content_qty  numeric(12,3),        -- cantidad normalizada a la unidad base (ej 500)
  content_unit text,                 -- 'gr' | 'ml' | null (null si es 'un' o no parseable)
  unit_price   numeric(12,4),        -- price / content_qty ya calculado, null si no aplica
  updated_at   timestamptz default now(),
  unique (business_id, sku)
);

create index idx_products_business on public.products(business_id);
create index idx_products_lab on public.products(business_id, lab);

-- ============================================================
-- 4) SNAPSHOTS DIARIOS (historial de precios) — scoped por business_id
-- ============================================================
create table public.price_snapshots (
  id            bigserial primary key,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  snapshot_date date not null default current_date,
  sku           text not null,
  name          text,
  price         numeric(12,2),
  lab           text,
  content_raw   text,
  content_qty   numeric(12,3),
  content_unit  text,
  unit_price    numeric(12,4),
  created_at    timestamptz default now(),
  unique (business_id, snapshot_date, sku)
);

create index idx_snapshots_business_date on public.price_snapshots(business_id, snapshot_date);
create index idx_snapshots_sku on public.price_snapshots(sku);

alter table public.products enable row level security;
alter table public.price_snapshots enable row level security;

create policy "productos del propio negocio"
  on public.products for all
  using (business_id = (select business_id from public.profiles where id = auth.uid()))
  with check (business_id = (select business_id from public.profiles where id = auth.uid()));

create policy "snapshots del propio negocio"
  on public.price_snapshots for all
  using (business_id = (select business_id from public.profiles where id = auth.uid()))
  with check (business_id = (select business_id from public.profiles where id = auth.uid()));

-- Vista opcional para análisis ad-hoc en Supabase Studio.
-- security_invoker=on hace que respete el RLS del usuario que consulta,
-- en vez de correr con los privilegios del dueño de la vista.
create or replace view price_changes_today
with (security_invoker = on) as
select
  t.business_id, t.sku, t.name, t.lab,
  t.price       as price_today,
  y.price       as price_yesterday,
  (t.price - y.price) as price_diff,
  t.unit_price  as unit_price_today,
  y.unit_price  as unit_price_yesterday,
  case when t.price <> y.price then true else false end as changed
from price_snapshots t
join price_snapshots y
  on t.business_id = y.business_id
 and t.sku = y.sku
 and t.snapshot_date = current_date
 and y.snapshot_date = current_date - interval '1 day';

-- ============================================================
-- 5) STORAGE: bucket de logos (público en lectura, escritura scoped)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Público en lectura: el logo no es información sensible y debe
-- poder mostrarse en <img> sin firmar URLs (más simple para imprimir).
create policy "cualquiera puede ver logos"
  on storage.objects for select
  using (bucket_id = 'logos');

-- Convención de path: logos/{business_id}/logo.<ext>
create policy "el negocio sube su propio logo"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select business_id::text from public.profiles where id = auth.uid())
  );

create policy "el negocio reemplaza su propio logo"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select business_id::text from public.profiles where id = auth.uid())
  );
