-- =====================================================================
--  TS SPORTS — Comentarios / actividad por marca
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  (Ejecuta esto DESPUÉS de supabase-crm.sql y supabase-crm-roles.sql)
-- =====================================================================

create table if not exists public.deal_comments (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid references public.deals(id) on delete cascade,
  author      uuid default auth.uid(),
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.deal_comments enable row level security;

-- Ver los comentarios de las marcas que puedes ver (dueño o admin)
drop policy if exists "comments select" on public.deal_comments;
create policy "comments select" on public.deal_comments for select to authenticated
  using (exists (
    select 1 from public.deals d
    where d.id = deal_id and (d.owner = auth.uid() or d.owner is null or public.is_admin())
  ));

-- Crear un comentario (a tu nombre)
drop policy if exists "comments insert" on public.deal_comments;
create policy "comments insert" on public.deal_comments for insert to authenticated
  with check (author = auth.uid());

-- Borrar el propio (o admin)
drop policy if exists "comments delete" on public.deal_comments;
create policy "comments delete" on public.deal_comments for delete to authenticated
  using (author = auth.uid() or public.is_admin());
