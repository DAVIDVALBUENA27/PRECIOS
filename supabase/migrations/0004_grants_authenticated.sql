-- Fix: las tablas se crearon por SQL crudo y el rol `authenticated` no recibió
-- los GRANT de tabla (los da el editor de Supabase, no un CREATE TABLE manual).
-- Sin GRANT, incluso los subqueries dentro de las políticas de Storage sobre
-- `profiles` fallan con "permission denied for table profiles".
--
-- Esto NO debilita la seguridad: la RLS sigue siendo la que filtra qué filas
-- ve/edita cada usuario. El GRANT solo habilita la CLASE de operación.

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on public.profiles         to authenticated;
grant select, insert, update, delete on public.businesses       to authenticated;
grant select, insert, update, delete on public.products         to authenticated;
grant select, insert, update, delete on public.price_snapshots  to authenticated;

-- Secuencias de las tablas bigserial (products / price_snapshots) para poder insertar.
grant usage, select on all sequences in schema public to authenticated;
