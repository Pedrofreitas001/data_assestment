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

do $$ declare t text; begin
  foreach t in array array['chat_threads','priorities'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('drop policy if exists %1$s_rw on public.%1$s', t);
    execute format($p$create policy %1$s_rw on public.%1$s for all
      using (public.is_staff() or organization_id = public.my_org())
      with check (public.is_staff() or organization_id = public.my_org())$p$, t);
  end loop;
end $$;

notify pgrst, 'reload schema';
