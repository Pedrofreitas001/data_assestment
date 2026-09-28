-- Cole e rode esta parte inteira no SQL Editor, espere terminar, depois vá para a próxima.

-- ---------- updated_at automático ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_organizations on public.organizations;
create trigger trg_touch_organizations before update on public.organizations for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_profiles on public.profiles;
create trigger trg_touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_assessments on public.assessments;
create trigger trg_touch_assessments before update on public.assessments for each row execute function public.touch_updated_at();
drop trigger if exists trg_touch_kpis on public.kpis;
create trigger trg_touch_kpis before update on public.kpis for each row execute function public.touch_updated_at();

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
drop policy if exists assessments_rw on public.assessments;
create policy assessments_rw on public.assessments for all
  using (public.is_staff() or organization_id = public.my_org())
  with check (public.is_staff() or organization_id = public.my_org());
drop policy if exists kpis_rw on public.kpis;
create policy kpis_rw on public.kpis for all
  using (public.is_staff() or organization_id = public.my_org())
  with check (public.is_staff() or organization_id = public.my_org());

-- ---------- Visão consolidada para o painel da gestora ----------
drop view if exists public.portfolio_overview;
create view public.portfolio_overview with (security_invoker = true) as
select
  o.id, o.name, o.segment, o.size, o.status,
  (select count(*) from public.assessments a where a.organization_id = o.id) as assessments,
  (select a.score from public.assessments a where a.organization_id = o.id order by a.updated_at desc limit 1) as last_score,
  (select a.level from public.assessments a where a.organization_id = o.id order by a.updated_at desc limit 1) as last_level,
  (select a.status from public.assessments a where a.organization_id = o.id order by a.updated_at desc limit 1) as last_status,
  (select max(a.updated_at) from public.assessments a where a.organization_id = o.id) as last_activity,
  (select count(*) from public.kpis k where k.organization_id = o.id) as kpis
from public.organizations o;
-- Primeiro acesso: se ainda não existe nenhum admin, quem chamar vira admin.
-- Depois que existe um admin, a função não faz nada (retorna false).
create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); em text;
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.profiles where role = 'admin') then return false; end if;
  select email into em from auth.users where id = uid;
  insert into public.profiles (id, email, full_name, role)
  values (uid, coalesce(em, ''), split_part(coalesce(em, ''), '@', 1), 'admin')
  on conflict (id) do update set role = 'admin';
  return true;
end $$;

revoke all on function public.claim_first_admin() from public;
grant execute on function public.claim_first_admin() to authenticated;
