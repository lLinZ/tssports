-- =====================================================================
--  TS SPORTS — Que un comercial pueda trabajar los leads del formulario web
--
--  PROBLEMA:
--    Los leads que entran por la web se guardan sin dueño (owner = NULL).
--    La policy de select los deja ver a todos, pero las de update/delete
--    exigen owner = auth.uid(), y NULL nunca es igual a nada. Resultado:
--    el comercial ve el lead y no puede tocarlo. Peor: PostgREST no da
--    error, solo afecta 0 filas, así que la interfaz decía "Guardado ✔"
--    sin haber guardado nada.
--
--  QUÉ HACE ESTO:
--    Un comercial puede EDITAR un lead sin dueño y, al guardarlo, queda
--    a su nombre (lo hace crm.js poniendo owner = su usuario).
--    BORRAR sigue siendo solo del dueño o del admin.
--
--  Supabase → SQL Editor → New query → pega esto → Run. Re-ejecutable.
-- =====================================================================

-- UPDATE: se puede tocar lo propio, lo que no tiene dueño, o todo si eres admin.
-- El with check impide asignarle la marca a OTRO comercial: solo puedes
-- dejarla sin dueño o ponerla a tu nombre.
drop policy if exists "deals update propio" on public.deals;
create policy "deals update propio" on public.deals for update to authenticated
  using       (owner = auth.uid() or owner is null or public.is_admin())
  with check  (owner = auth.uid() or owner is null or public.is_admin());

-- DELETE: sin cambios, a propósito. Un lead de la web no lo puede borrar
-- cualquiera; que lo haga su dueño una vez lo adopte, o un admin.
drop policy if exists "deals delete propio" on public.deals;
create policy "deals delete propio" on public.deals for delete to authenticated
  using (owner = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- Limpieza: las 2 marcas de prueba que dejó Claude al depurar.
-- (Aquí sí se borran: el SQL Editor corre como service_role y salta RLS.)
-- ---------------------------------------------------------------------
delete from public.deals
where brand in ('__probe2__', 'Pepsi Venezuela') and owner is null;

-- Comprobación: debe devolver 0 filas
select id, brand, owner from public.deals
where brand in ('__probe2__', 'Pepsi Venezuela');
