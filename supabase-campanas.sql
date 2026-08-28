-- =====================================================================
--  TS SPORTS — Campañas de la marca
--  Supabase → SQL Editor → New query → pega TODO → Run. Re-ejecutable.
--
--  QUÉ AGREGA:
--    Una columna `campana` en `deals` para saber con qué acción comercial
--    se está trabajando cada marca: si se la visitó, si se le mandó
--    material POP o a qué evento se la invitó.
--
--  POR QUÉ UNA COLUMNA DE TEXTO Y NO UNA TABLA APARTE:
--    Es exactamente el mismo caso que `sector` y `zona`, que ya viven
--    así. La lista es corta, cerrada y la mantiene el equipo en
--    crm.js (constante CAMPANAS). Una tabla con su join solo tendría
--    sentido si cada campaña necesitara fechas, presupuesto o dueño;
--    hoy no es el caso.
--
--    Si algún día hacen falta esos datos, la migración es directa:
--    crear la tabla y rellenarla con
--      select distinct campana from public.deals where campana <> '';
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) La columna
-- ---------------------------------------------------------------------
alter table public.deals add column if not exists campana text default '';

-- ---------------------------------------------------------------------
-- 2) Índice para el filtro del tablero
-- ---------------------------------------------------------------------
-- El tablero filtra por campaña con mucha frecuencia; sin índice, cada
-- filtro recorre la tabla entera.
create index if not exists deals_campana_idx on public.deals(campana);

-- ---------------------------------------------------------------------
-- 3) COMPROBACIÓN — debe devolver 1 fila
-- ---------------------------------------------------------------------
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'deals'
  and column_name = 'campana';

-- ¡Listo! Recarga crm.html y verás el selector de campaña en la ficha
-- (paso 1) y el filtro "Todas las campañas" en la barra de arriba.
