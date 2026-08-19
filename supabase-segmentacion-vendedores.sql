-- =====================================================================
--  TS SPORTS — Segmentación de marcas + rol Vendedor
--  Supabase → SQL Editor → New query → pega TODO → Run. Re-ejecutable.
--
--  QUÉ AGREGA:
--   1) Segmentación de la marca: sector + ¿invierte actualmente? (sí/no).
--   2) Un rol nuevo "vendedor" y la asignación de un vendedor por marca.
--      · admin y comercial: ven y editan TODO, y asignan vendedores.
--      · vendedor: VE todas las marcas, pero solo EDITA las asignadas a él.
--
--  OJO — CAMBIO DE VISIBILIDAD: hasta ahora un comercial solo veía sus
--  marcas y las sin dueño. Con este modelo (para que vendedor "vea todo"
--  y el comercial pueda asignar) TODOS los usuarios autenticados ven
--  todas las marcas. Editar/borrar sí queda acotado por rol.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) DEALS: columnas nuevas
-- ---------------------------------------------------------------------
alter table public.deals add column if not exists sector        text default '';   -- rubro de la marca
alter table public.deals add column if not exists invierte      text default '';   -- '', 'si', 'no' (¿invierte hoy en patrocinios?)
alter table public.deals add column if not exists assigned_to   uuid;              -- vendedor responsable
alter table public.deals add column if not exists assigned_name text default '';   -- nombre del vendedor (para mostrar sin join)

create index if not exists deals_assigned_to_idx on public.deals(assigned_to);

-- ---------------------------------------------------------------------
-- 2) Rol del usuario actual, sin recursión de RLS (security definer)
--    Devuelve 'admin' | 'comercial' | 'vendedor'. Sin perfil => comercial.
-- ---------------------------------------------------------------------
create or replace function public.my_role() returns text
language sql security definer stable as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'comercial');
$$;

-- ---------------------------------------------------------------------
-- 3) RLS de DEALS
-- ---------------------------------------------------------------------
-- SELECT: todos los autenticados ven todas las marcas.
drop policy if exists "deals select propio" on public.deals;
drop policy if exists "deals select todos"  on public.deals;
create policy "deals select todos" on public.deals for select to authenticated
  using (true);

-- UPDATE: admin y comercial editan todo; el vendedor solo lo asignado a él.
-- El with check con assigned_to = auth.uid() impide que un vendedor se
-- pase la marca a otro (o se la quite) al guardar.
drop policy if exists "deals update propio" on public.deals;
drop policy if exists "deals update"        on public.deals;
create policy "deals update" on public.deals for update to authenticated
  using (
    public.is_admin()
    or public.my_role() = 'comercial'
    or (public.my_role() = 'vendedor' and assigned_to = auth.uid())
  )
  with check (
    public.is_admin()
    or public.my_role() = 'comercial'
    or (public.my_role() = 'vendedor' and assigned_to = auth.uid())
  );

-- DELETE: solo admin y comercial. El vendedor no borra.
drop policy if exists "deals delete propio" on public.deals;
drop policy if exists "deals delete"        on public.deals;
create policy "deals delete" on public.deals for delete to authenticated
  using (public.is_admin() or public.my_role() = 'comercial');

-- INSERT: se mantiene "deals insert publico" (con check true) para el
-- formulario web y para que cualquier usuario autenticado registre marcas.

-- ---------------------------------------------------------------------
-- 4) PROFILES: que cualquier autenticado pueda LEER la lista de usuarios
--    (necesario para poblar el selector de "vendedor asignado" y para
--    mostrar el nombre del dueño/vendedor). Cambiar roles/zonas sigue
--    siendo solo del propio usuario o de un admin (policies de update/insert
--    no se tocan).
-- ---------------------------------------------------------------------
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated
  using (true);

-- ¡Listo! En la vista de Usuarios ya puedes marcar usuarios como "Vendedor".
