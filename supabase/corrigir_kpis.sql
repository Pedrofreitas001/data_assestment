-- =====================================================================
-- CORRIGE A PERMISSÃO DA TABELA kpis (Glossário / Biblioteca Moulis)
--
-- Sintoma: "Sem permissão para esta ação (tabela kpis)" ao importar ou
-- salvar um KPI, mesmo sendo admin.
--
-- Para um admin, o banco só bloqueia se:
--   (a) a política kpis_rw não existe ou está diferente;
--   (b) existe uma política antiga RESTRITIVA na tabela (de versões anteriores);
--   (c) o banco não reconhece o usuário como admin (perfil sem role 'admin').
-- Este script corrige (a) e (b) e, no final, testa (c) como se fosse você.
--
-- Como usar: troque SEU_EMAIL@EXEMPLO.COM (no fim do arquivo) pelo e-mail
-- com que você entra no app e rode tudo no SQL Editor do Supabase.
-- O teste final é desfeito (rollback): nenhum KPI de teste fica salvo.
-- =====================================================================

-- 1) Remove políticas RESTRITIVAS antigas da tabela kpis (elas bloqueiam até admin).
create or replace function public._moulis_drop_restrictive_kpis() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'kpis' and permissive = 'RESTRICTIVE'
  loop
    execute format('drop policy %I on public.kpis', r.policyname);
  end loop;
end $$;
select public._moulis_drop_restrictive_kpis();
drop function public._moulis_drop_restrictive_kpis();

-- 2) Recria a política correta e as permissões da tabela.
alter table public.kpis enable row level security;
drop policy if exists kpis_rw on public.kpis;
create policy kpis_rw on public.kpis for all
  using (public.is_staff() or organization_id = public.my_org())
  with check (public.is_staff() or organization_id = public.my_org());
grant select, insert, update, delete on public.kpis to authenticated;
grant execute on function public.is_staff(), public.my_org(), public.my_role() to authenticated;
notify pgrst, 'reload schema';

-- 3) Situação depois da correção: políticas que restaram na tabela kpis.
select policyname as politica, permissive as tipo, cmd as comando,
       coalesce(qual, '') as regra_leitura, coalesce(with_check, '') as regra_gravacao
from pg_policies where schemaname = 'public' and tablename = 'kpis'
order by policyname;

-- 4) Teste como se fosse você: troque o e-mail abaixo.
--    Se aparecer uma linha com is_staff = true e um id, está resolvido.
--    Se der erro, copie a mensagem e envie.
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from auth.users where lower(email) = lower('SEU_EMAIL@EXEMPLO.COM')), 'role', 'authenticated')::text, true);
select set_config('request.jwt.claim.sub',
  coalesce((select id::text from auth.users where lower(email) = lower('SEU_EMAIL@EXEMPLO.COM')), ''), true);
set local role authenticated;
select public.my_role() as meu_papel, public.is_staff() as is_staff;
insert into public.kpis (organization_id, name, status)
values ((select id from public.organizations order by created_at limit 1), 'Teste de permissão (será desfeito)', 'rascunho')
returning id, name;
rollback;
