-- =====================================================================
-- Priorização das áreas (valor em jogo × prontidão) e avaliação do
-- steward do diagnóstico.
-- impact_maps: uma linha por empresa — mesma regra dos diagnósticos.
-- steward_reviews: avaliação de pessoas — só a equipe Moulis vê e edita.
-- =====================================================================

create table if not exists public.impact_maps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  areas jsonb not null default '{}'::jsonb,
  manual_order jsonb,
  justifications jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists impact_maps_org_uidx on public.impact_maps(organization_id);

create table if not exists public.steward_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role text,
  area text,
  answers jsonb not null default '{}'::jsonb,
  notes text,
  chosen boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists steward_reviews_org_idx on public.steward_reviews(organization_id, updated_at desc);

drop trigger if exists trg_touch_impact_maps on public.impact_maps;
create trigger trg_touch_impact_maps before update on public.impact_maps for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_steward_reviews on public.steward_reviews;
create trigger trg_touch_steward_reviews before update on public.steward_reviews for each row execute function public.touch_updated_at();

alter table public.impact_maps enable row level security;
drop policy if exists impact_maps_rw on public.impact_maps;
create policy impact_maps_rw on public.impact_maps for all
  using (public.is_staff() or organization_id = public.my_org())
  with check (public.is_staff() or organization_id = public.my_org());

alter table public.steward_reviews enable row level security;
drop policy if exists steward_reviews_staff on public.steward_reviews;
create policy steward_reviews_staff on public.steward_reviews for all
  using (public.is_staff())
  with check (public.is_staff());

grant select, insert, update, delete on public.impact_maps, public.steward_reviews to authenticated;

notify pgrst, 'reload schema';
