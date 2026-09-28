-- Cole e rode esta parte inteira no SQL Editor, espere terminar, depois vá para a próxima.

-- =====================================================================
-- SETUP COMPLETO — cria ou ATUALIZA o banco para a versão atual do app.
-- Seguro para rodar quantas vezes quiser (idempotente).
-- Supabase → SQL Editor → cole tudo → Run.
-- =====================================================================
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
