-- =====================================================================
-- Histórico de conversas com o assistente e Prioridades (por empresa).
-- Mesma regra de acesso dos diagnósticos: equipe Moulis vê tudo,
-- cliente vê apenas a própria organização.
-- =====================================================================

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

notify pgrst, 'reload schema';
