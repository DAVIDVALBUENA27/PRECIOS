-- Fixes reportados por el advisor de seguridad de Supabase tras aplicar 002.

-- 1) El bucket 'logos' es público (storage.buckets.public = true), lo que ya
--    permite descargar objetos vía URL pública sin ninguna policy de RLS.
--    La policy de SELECT que agregábamos en 002 no aportaba nada a esa lectura
--    pública, pero sí habilitaba el listado completo del bucket vía la API
--    autenticada (storage.list()). Se elimina: no la necesitamos.
drop policy if exists "cualquiera puede ver logos" on storage.objects;

-- 2) handle_new_user() es SECURITY DEFINER y el linter marca que anon/authenticated
--    podrían invocarlo directamente vía RPC (aunque Postgres ya bloquea llamar
--    funciones RETURNS TRIGGER fuera de un trigger). Se revoca el EXECUTE
--    explícito por buena práctica de mínimo privilegio.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
