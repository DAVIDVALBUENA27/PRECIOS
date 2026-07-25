-- Fase 2 — Perfil del Negocio + Logo en Etiquetas
-- Ejecutar en el SQL Editor del proyecto PRECIOS (ztiekhldohoyuuwihrff).

-- 1) Columnas nuevas en businesses
alter table public.businesses add column if not exists logo_url text;
alter table public.businesses add column if not exists accent_color text default '#2563EB';
alter table public.businesses add column if not exists tax_id text;
alter table public.businesses add column if not exists settings jsonb default '{}'::jsonb;

-- 1b) RLS de businesses: el usuario puede leer/actualizar SOLO su propio negocio.
--     (Idempotente; las policies permisivas se combinan con OR, no restan acceso.)
alter table public.businesses enable row level security;

drop policy if exists "businesses_tenant_select" on public.businesses;
create policy "businesses_tenant_select"
on public.businesses for select to authenticated
using (id = (select business_id from public.profiles where id = auth.uid()));

drop policy if exists "businesses_tenant_update" on public.businesses;
create policy "businesses_tenant_update"
on public.businesses for update to authenticated
using (id = (select business_id from public.profiles where id = auth.uid()))
with check (id = (select business_id from public.profiles where id = auth.uid()));

-- 2) Bucket de logos.
--    Lectura pública: el logo se imprime en etiquetas de góndola (contenido público).
--    Escritura restringida al business_id del usuario (carpeta raíz = business_id).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- 3) Políticas de escritura tenant-scoped sobre storage.objects
drop policy if exists "logos_tenant_insert" on storage.objects;
create policy "logos_tenant_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = (
    select business_id::text from public.profiles where id = auth.uid()
  )
);

drop policy if exists "logos_tenant_update" on storage.objects;
create policy "logos_tenant_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = (
    select business_id::text from public.profiles where id = auth.uid()
  )
);

drop policy if exists "logos_tenant_delete" on storage.objects;
create policy "logos_tenant_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'logos'
  and (storage.foldername(name))[1] = (
    select business_id::text from public.profiles where id = auth.uid()
  )
);
