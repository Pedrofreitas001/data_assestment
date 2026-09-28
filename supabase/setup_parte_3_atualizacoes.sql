-- Cole e rode esta parte inteira no SQL Editor, espere terminar, depois vá para a próxima.

-- ---------- Atualização de bancos criados com versões anteriores ----------
alter table public.organizations add column if not exists segment text;
alter table public.organizations add column if not exists size text;
alter table public.organizations add column if not exists city text;
alter table public.organizations add column if not exists contact_name text;
alter table public.organizations add column if not exists contact_email text;
alter table public.organizations add column if not exists notes text;
alter table public.organizations add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.assessments add column if not exists scope text;
alter table public.assessments add column if not exists respondent text;
alter table public.assessments add column if not exists context jsonb not null default '{}'::jsonb;
alter table public.assessments add column if not exists answers jsonb not null default '{}'::jsonb;
alter table public.assessments add column if not exists evidence jsonb not null default '{}'::jsonb;
alter table public.assessments add column if not exists ai_insights jsonb;
alter table public.assessments add column if not exists report_notes jsonb not null default '[]'::jsonb;
alter table public.assessments add column if not exists score numeric(5,2);
alter table public.assessments add column if not exists level smallint;
alter table public.assessments add column if not exists updated_at timestamptz not null default now();

alter table public.kpis add column if not exists business_question text;
alter table public.kpis add column if not exists numerator text;
alter table public.kpis add column if not exists denominator text;
alter table public.kpis add column if not exists direction text;
alter table public.kpis add column if not exists target text;
alter table public.kpis add column if not exists exclusions text;
alter table public.kpis add column if not exists lineage text;
alter table public.kpis add column if not exists quality_checks text;
alter table public.kpis add column if not exists consumers text;
alter table public.kpis add column if not exists version text default '1.0';
alter table public.kpis add column if not exists notes text;
alter table public.kpis add column if not exists updated_at timestamptz not null default now();

-- ---------- Histórico de conversas e Prioridades ----------
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null default 'Conversa',
  messages jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_threads_org_idx on public.chat_threads(organization_id, updated_at desc);

create table if not exists public.priorities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  question text,
  answer text not null,
  status text not null default 'aberta' check (status in ('aberta','em_andamento','concluida')),
  thread_id uuid references public.chat_threads(id) on delete set null,
  message_id text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists priorities_org_idx on public.priorities(organization_id, updated_at desc);

drop trigger if exists trg_touch_chat_threads on public.chat_threads;
create trigger trg_touch_chat_threads before update on public.chat_threads for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_priorities on public.priorities;
create trigger trg_touch_priorities before update on public.priorities for each row execute function public.touch_updated_at();

alter table public.chat_threads enable row level security;
drop policy if exists chat_threads_rw on public.chat_threads;
create policy chat_threads_rw on public.chat_threads for all
  using (public.is_staff() or organization_id = public.my_org())
  with check (public.is_staff() or organization_id = public.my_org());

alter table public.priorities enable row level security;
drop policy if exists priorities_rw on public.priorities;
create policy priorities_rw on public.priorities for all
  using (public.is_staff() or organization_id = public.my_org())
  with check (public.is_staff() or organization_id = public.my_org());

-- Perfis para usuários criados antes do trigger existir.
insert into public.profiles (id, email, full_name)
select u.id, u.email, split_part(u.email, '@', 1) from auth.users u
on conflict (id) do nothing;

-- Recarrega o cache de esquema da API (evita "column not found in schema cache").
notify pgrst, 'reload schema';

-- ---------- Depois de rodar: torne-se admin (troque o e-mail) ----------
-- update public.profiles set role = 'admin' where email = 'seu@email.com';
