-- =====================================================================
--  TS SPORTS — CRM multi-comercial con ROLES
--  Pega TODO esto en: Supabase → SQL Editor → New query → Run
--  (Ejecuta esto DESPUÉS del supabase-crm.sql)
-- =====================================================================

-- 1) PERFILES: un rol por usuario (comercial | admin)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text,
  role        text not null default 'comercial',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

-- Función para saber si el usuario actual es admin (sin recursión de RLS)
create or replace function public.is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Crea el perfil automáticamente cuando se registra un usuario nuevo
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Crea perfiles para los usuarios que YA existían
insert into public.profiles (id, email, name)
select id, email, split_part(email,'@',1) from auth.users
on conflict (id) do nothing;

-- 2) Ampliar la tabla de oportunidades
alter table public.deals add column if not exists owner          uuid default auth.uid();
alter table public.deals add column if not exists owner_name     text;
alter table public.deals add column if not exists logo           text default '';
alter table public.deals add column if not exists st_aproximacion boolean default false;
alter table public.deals add column if not exists st_prospeccion  boolean default false;
alter table public.deals add column if not exists st_propuesta    boolean default false;

-- 3) RLS de deals: cada comercial ve LO SUYO; el admin ve TODO
drop policy if exists "deals select auth" on public.deals;
drop policy if exists "deals update auth" on public.deals;
drop policy if exists "deals delete auth" on public.deals;

create policy "deals select propio" on public.deals for select to authenticated
  using (owner = auth.uid() or owner is null or public.is_admin());

create policy "deals update propio" on public.deals for update to authenticated
  using (owner = auth.uid() or public.is_admin()) with check (true);

create policy "deals delete propio" on public.deals for delete to authenticated
  using (owner = auth.uid() or public.is_admin());
-- (se mantiene "deals insert publico" para el formulario de la web)

-- =====================================================================
--  IMPORTANTE: marca TU usuario como admin (cambia el email por el tuyo)
-- =====================================================================
-- update public.profiles set role = 'admin' where email = 'TU-EMAIL-AQUI';
