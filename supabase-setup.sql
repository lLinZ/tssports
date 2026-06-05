-- =====================================================================
--  TS SPORTS — Configuración de Supabase para el CRM
--  Pega TODO esto en:  Supabase  →  SQL Editor  →  New query  →  Run
-- =====================================================================

-- 1) Tabla que guarda el contenido del sitio (una sola fila, id = 1)
create table if not exists public.site_content (
  id          integer primary key,
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Seguridad por filas (RLS)
alter table public.site_content enable row level security;

-- 2a) Cualquiera puede LEER el contenido (la web pública lo necesita)
drop policy if exists "lectura publica" on public.site_content;
create policy "lectura publica"
  on public.site_content for select
  using (true);

-- 2b) Solo usuarios autenticados (tú, desde el panel) pueden ESCRIBIR
drop policy if exists "escritura autenticada" on public.site_content;
create policy "escritura autenticada"
  on public.site_content for all
  to authenticated
  using (true)
  with check (true);

-- 3) Bucket de almacenamiento PÚBLICO para las imágenes
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- 3a) Lectura pública de las imágenes
drop policy if exists "media lectura publica" on storage.objects;
create policy "media lectura publica"
  on storage.objects for select
  using (bucket_id = 'media');

-- 3b) Solo usuarios autenticados pueden subir / borrar imágenes
drop policy if exists "media subida autenticada" on storage.objects;
create policy "media subida autenticada"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "media borrado autenticado" on storage.objects;
create policy "media borrado autenticado"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media');

-- ¡Listo! Ahora crea tu usuario admin en  Authentication → Users → Add user.
