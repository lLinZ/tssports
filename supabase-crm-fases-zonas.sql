-- =====================================================================
--  TS SPORTS — Fases del cliente (sí/no) + Zonas de prospectores
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  (Ejecuta esto DESPUÉS de supabase-crm.sql y supabase-crm-roles.sql)
-- =====================================================================

-- 1) DEALS: campos del formato que pide el cliente
--    Prospección = datos completos (contacto, cargo, email, logo, marca)
--    Aproximación = sí/no + vía (Conocido / WhatsApp)
--    Propuesta    = sí/no + descripción obligatoria
--    Valor        = 100% del valor de la propuesta pasada
alter table public.deals add column if not exists cargo           text default '';   -- cargo del contacto
alter table public.deals add column if not exists st_aproximacion boolean default false;
alter table public.deals add column if not exists st_prospeccion  boolean default false;
alter table public.deals add column if not exists st_propuesta    boolean default false;
alter table public.deals add column if not exists aprox_via       text default '';   -- Conocido / WhatsApp / Otro
alter table public.deals add column if not exists prospeccion_via text default '';   -- Instagram / Supermercado / Valla / Radio / Evento
alter table public.deals add column if not exists propuesta_desc  text default '';   -- descripción de la propuesta (obligatoria si hay propuesta)
alter table public.deals add column if not exists zona            text default '';   -- heredada del prospector que la registra

-- 2) PROFILES: zona del prospector
--    Zonas: Caracas / Centro / Lara / Andes-Zulia / Oriente
alter table public.profiles add column if not exists zona text default '';

-- 3) BACKFILL: no perder el avance de las marcas que se movieron con el
--    select de etapas viejo (solo enciende, nunca apaga)
update public.deals set st_aproximacion = true
  where stage in ('aproximacion','seguimiento','propuesta','negociacion','ganado') and not st_aproximacion;
update public.deals set st_propuesta = true
  where stage in ('propuesta','negociacion','ganado') and not st_propuesta;

-- Recalcula Prospección = datos obligatorios completos
update public.deals set st_prospeccion =
  (coalesce(brand,'') <> '' and coalesce(contact,'') <> '' and coalesce(cargo,'') <> ''
   and coalesce(email,'') <> '' and coalesce(logo,'') <> '');

-- Las marcas heredan la zona de su dueño (re-ejecutable cuando asignes zonas)
update public.deals d set zona = p.zona
  from public.profiles p
  where d.owner = p.id and coalesce(d.zona,'') = '' and coalesce(p.zona,'') <> '';

-- ¡Listo! Asigna la zona de cada prospector desde la vista de Usuarios.
