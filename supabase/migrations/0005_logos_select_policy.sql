-- Auto-blindaje: subir el logo fallaba con
--   {"statusCode":"403","message":"new row violates row-level security policy"}
--
-- Causa raíz: el bucket `logos` tenía policies de INSERT/UPDATE/DELETE pero
-- ninguna de SELECT. Storage sube con upsert, que ejecuta
-- `insert ... on conflict do update ... returning`, y Postgres exige policy de
-- SELECT en cuanto hay RETURNING. Sin ella, el INSERT válido se reporta como
-- violación de RLS.
--
-- Esta policy NO amplía el acceso entre negocios: cada negocio solo ve los
-- objetos bajo su propio prefijo `<business_id>/`.

create policy "logos_tenant_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (
      select profiles.business_id::text
      from profiles
      where profiles.id = auth.uid()
    )
  );
