-- =====================================================================
-- Moulis · Assessment de Maturidade de Dados — schema inicial
-- Papéis:
--   admin     → gestora da consultoria: tudo + gestão de usuários
--   consultor → vê e edita todos os clientes
--   cliente   → vê e edita apenas a própria organização
-- Rode no SQL Editor do Supabase (ou `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Organizações (clientes da consultoria) ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text,
  size text,
  city text,
  contact_name text,
  contact_email text,
  status text not null default 'ativo' check (status in ('ativo','pausado','encerrado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Perfis (1:1 com auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'cliente' check (role in ('admin','consultor','cliente')),
  organization_id uuid references public.organizations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Assessments ----------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  scope text,
  respondent text,
  status text not null default 'rascunho' check (status in ('rascunho','em_revisao','concluido')),
  context jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  ai_insights jsonb,
  report_notes jsonb not null default '[]'::jsonb,
  score numeric(5,2),
  level smallint check (level between 1 and 5),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assessments_org_idx on public.assessments(organization_id, updated_at desc);

-- ---------- Glossário de KPIs ----------
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  domain text,
  definition text,
  business_question text,
  formula text,
  numerator text,
  denominator text,
  unit text,
  granularity text,
  frequency text,
  direction text check (direction in ('maior_melhor','menor_melhor','faixa')),
  target text,
  owner text,
  steward text,
  assumptions text,
  exclusions text,
  source_tables text,
  lineage text,
  quality_checks text,
  consumers text,
  status text not null default 'rascunho' check (status in ('rascunho','em_validacao','validado','descontinuado')),
  version text default '1.0',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kpis_org_idx on public.kpis(organization_id);

-- ---------- updated_at automático ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

do $$ declare t text; begin
  foreach t in array array['organizations','profiles','assessments','kpis'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Perfil criado automaticamente no signup/convite ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, organization_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'cliente'),
    nullif(new.raw_user_meta_data->>'organization_id', '')::uuid
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Helpers de autorização (security definer evita recursão de RLS) ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_org() returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','consultor'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

-- Impede que um usuário comum altere o próprio papel/organização.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- SQL Editor / service role (sem usuário logado) podem tudo.
  if auth.uid() is null then return new; end if;
  if not public.is_admin() and (new.role is distinct from old.role or new.organization_id is distinct from old.organization_id) then
    raise exception 'Somente administradores podem alterar papel ou organização';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
for each row execute function public.guard_profile_update();

-- ---------- RLS ----------
alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.assessments   enable row level security;
alter table public.kpis          enable row level security;

-- organizations
drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select
  using (public.is_staff() or id = public.my_org());
drop policy if exists org_write on public.organizations;
create policy org_write on public.organizations for all
  using (public.is_staff()) with check (public.is_staff());

-- profiles
drop policy if exists prof_select on public.profiles;
create policy prof_select on public.profiles for select
  using (id = auth.uid() or public.is_staff());
drop policy if exists prof_update_self on public.profiles;
create policy prof_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists prof_admin_delete on public.profiles;
create policy prof_admin_delete on public.profiles for delete using (public.is_admin());

-- tabelas por organização (mesma regra para todas)
do $$ declare t text; begin
  foreach t in array array['assessments','kpis'] loop
    execute format('drop policy if exists %1$s_rw on public.%1$s', t);
    execute format($p$create policy %1$s_rw on public.%1$s for all
      using (public.is_staff() or organization_id = public.my_org())
      with check (public.is_staff() or organization_id = public.my_org())$p$, t);
  end loop;
end $$;

-- ---------- Visão consolidada para o painel da gestora ----------
create or replace view public.portfolio_overview with (security_invoker = true) as
select
  o.id, o.name, o.segment, o.size, o.status,
  (select count(*) from public.assessments a where a.organization_id = o.id) as assessments,
  (select a.score from public.assessments a where a.organization_id = o.id order by a.updated_at desc limit 1) as last_score,
  (select a.level from public.assessments a where a.organization_id = o.id order by a.updated_at desc limit 1) as last_level,
  (select a.status from public.assessments a where a.organization_id = o.id order by a.updated_at desc limit 1) as last_status,
  (select max(a.updated_at) from public.assessments a where a.organization_id = o.id) as last_activity,
  (select count(*) from public.kpis k where k.organization_id = o.id) as kpis
from public.organizations o;
