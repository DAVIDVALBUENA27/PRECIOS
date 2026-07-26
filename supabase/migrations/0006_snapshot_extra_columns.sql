-- Las columnas propias de cada negocio (inventario, ubicación, proveedor…) se
-- guardaban solo en localStorage, así que al reabrir una lista desde otro
-- equipo se perdían. Con esto la lista guardada viaja completa.

alter table public.products add column if not exists extra jsonb;
alter table public.price_snapshots add column if not exists extra jsonb;
