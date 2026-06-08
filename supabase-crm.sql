-- =====================================================================
--  TS SPORTS — CRM de Patrocinios (tabla de oportunidades/clientes)
--  Pega TODO esto en:  Supabase → SQL Editor → New query → Run
-- =====================================================================

create table if not exists public.deals (
  id          uuid primary key default gen_random_uuid(),
  brand       text not null default '',   -- marca / cliente
  contact     text default '',            -- persona de contacto
  email       text default '',
  phone       text default '',
  value       numeric default 0,          -- valor estimado del patrocinio
  stage       text not null default 'nuevo',
  notes       text default '',
  source      text default 'manual',      -- 'web' si vino del formulario
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.deals enable row level security;

-- Cualquiera (el formulario público de la web) puede CREAR un lead
drop policy if exists "deals insert publico" on public.deals;
create policy "deals insert publico"
  on public.deals for insert
  with check (true);

-- Solo usuarios autenticados (Antonio en el panel) pueden ver/editar/borrar
drop policy if exists "deals select auth" on public.deals;
create policy "deals select auth"
  on public.deals for select to authenticated using (true);

drop policy if exists "deals update auth" on public.deals;
create policy "deals update auth"
  on public.deals for update to authenticated using (true) with check (true);

drop policy if exists "deals delete auth" on public.deals;
create policy "deals delete auth"
  on public.deals for delete to authenticated using (true);

-- ¡Listo! El CRM ya puede recibir leads y gestionarlos.
