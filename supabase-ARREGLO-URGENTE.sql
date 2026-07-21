-- =====================================================================
--  TS SPORTS — ARREGLO URGENTE (esto es lo que hace que NO se guarden marcas)
--
--  QUÉ PASA:
--    La tabla "deals" de tu Supabase NO tiene las columnas nuevas
--    (cargo, zona, aprox_via, prospeccion_via, propuesta_desc).
--    Por eso cada intento de guardar responde:
--      PGRST204 · Could not find the 'cargo' column of 'deals'
--    Y la tabla "profiles" no tiene "zona", por eso el CRM no puede
--    leer tu perfil (400) y luego tampoco crearlo (403).
--
--  CÓMO SE ARREGLA:
--    Supabase → SQL Editor → New query → pega TODO esto → Run.
--    Se puede correr las veces que quieras, no rompe ni borra nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) DEALS: columnas que le faltan
-- ---------------------------------------------------------------------
alter table public.deals add column if not exists cargo           text    default '';
alter table public.deals add column if not exists logo            text    default '';
alter table public.deals add column if not exists owner           uuid    default auth.uid();
alter table public.deals add column if not exists owner_name      text;
alter table public.deals add column if not exists zona            text    default '';
alter table public.deals add column if not exists aprox_via       text    default '';
alter table public.deals add column if not exists prospeccion_via text    default '';
alter table public.deals add column if not exists propuesta_desc  text    default '';
alter table public.deals add column if not exists st_aproximacion boolean default false;
alter table public.deals add column if not exists st_prospeccion  boolean default false;
alter table public.deals add column if not exists st_propuesta    boolean default false;

-- ---------------------------------------------------------------------
-- 2) PROFILES: columna zona + poder crear tu propio perfil
--    (faltaba la policy de INSERT: por eso salía 403 en profiles)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists zona text default '';

drop policy if exists "profiles insert propio" on public.profiles;
create policy "profiles insert propio" on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 3) Rellenar lo que ya existía (no apaga nada, solo enciende)
-- ---------------------------------------------------------------------
update public.deals set st_aproximacion = true
  where stage in ('aproximacion','seguimiento','propuesta','negociacion','ganado')
    and coalesce(st_aproximacion,false) = false;

update public.deals set st_propuesta = true
  where stage in ('propuesta','negociacion','ganado')
    and coalesce(st_propuesta,false) = false;

-- Prospección = tiene todos los datos obligatorios cargados
update public.deals set st_prospeccion =
  (coalesce(brand,'') <> '' and coalesce(contact,'') <> '' and coalesce(cargo,'') <> ''
   and coalesce(email,'') <> '' and coalesce(logo,'') <> '');

-- Cada marca hereda la zona de su prospector
update public.deals d set zona = p.zona
  from public.profiles p
  where d.owner = p.id and coalesce(d.zona,'') = '' and coalesce(p.zona,'') <> '';

-- ---------------------------------------------------------------------
-- 4) COMPROBACIÓN — esto debe devolver 11 filas (una por columna)
--    Si devuelve menos, algo de arriba no corrió.
-- ---------------------------------------------------------------------
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'deals'
  and column_name in ('cargo','logo','owner','owner_name','zona','aprox_via',
                      'prospeccion_via','propuesta_desc','st_aproximacion',
                      'st_prospeccion','st_propuesta')
order by column_name;
