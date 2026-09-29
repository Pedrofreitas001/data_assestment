-- =====================================================================
-- DIAGNÓSTICO DE RLS — só leitura, pode rodar quantas vezes quiser.
-- Cole no SQL Editor do Supabase e rode. O resultado é uma lista única:
-- "OK" = tudo certo · "ATENÇÃO" = precisa de correção (veja o detalhe).
-- =====================================================================
select item, situacao, detalhe from (

  -- 1) RLS ligada nas tabelas do app
  select 1 as ord, 'RLS ligada em ' || c.relname as item,
         case when c.relrowsecurity then 'OK' else 'ATENÇÃO' end as situacao,
         case when c.relrowsecurity then '' else 'rode o setup_completo.sql (alter table ... enable row level security)' end as detalhe
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('organizations','profiles','assessments','kpis','chat_threads','priorities')

  union all
  -- 2) funções de permissão
  select 2, 'Função public.' || f.nome || '()',
         case when exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f.nome) then 'OK' else 'ATENÇÃO' end,
         case when exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f.nome) then '' else 'não existe: rode o setup_completo.sql' end
  from (values ('my_role'),('my_org'),('is_staff'),('is_admin'),('claim_first_admin'),('handle_new_user'),('guard_profile_update')) as f(nome)

  union all
  -- 3) políticas esperadas
  select 3, 'Política ' || e.tabela || '.' || e.politica,
         case when exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = e.tabela and p.policyname = e.politica) then 'OK' else 'ATENÇÃO' end,
         case when exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = e.tabela and p.policyname = e.politica) then '' else 'ausente: rode o setup_completo.sql' end
  from (values
    ('organizations','org_select'),('organizations','org_write'),
    ('profiles','prof_select'),('profiles','prof_update_self'),('profiles','prof_admin_delete'),
    ('assessments','assessments_rw'),('kpis','kpis_rw'),('chat_threads','chat_threads_rw'),('priorities','priorities_rw')
  ) as e(tabela, politica)

  union all
  -- 4) políticas que NÃO são do app (legado): podem bloquear ou causar "infinite recursion"
  select 4, 'Política estranha ' || p.tablename || '.' || p.policyname, 'ATENÇÃO',
         p.cmd || case when p.permissive = 'RESTRICTIVE' then ' (restritiva)' else '' end || ' — apague com: drop policy "' || p.policyname || '" on public.' || p.tablename || ';'
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('organizations','profiles','assessments','kpis','chat_threads','priorities')
    and p.policyname not in ('org_select','org_write','prof_select','prof_update_self','prof_admin_delete','assessments_rw','kpis_rw','chat_threads_rw','priorities_rw')

  union all
  -- 5) gatilho que cria o perfil no cadastro
  select 5, 'Gatilho on_auth_user_created',
         case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then 'OK' else 'ATENÇÃO' end,
         case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then '' else 'sem ele, novos usuários ficam sem perfil (e sem acesso)' end

  union all
  -- 6) usuários sem perfil (ficam sem acesso a nada)
  select 6, 'Usuários sem perfil', case when count(*) = 0 then 'OK' else 'ATENÇÃO' end,
         case when count(*) = 0 then '' else count(*) || ' usuário(s): ' || string_agg(u.email, ', ') || ' — rode o setup_completo.sql (cria os perfis que faltam)' end
  from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)

  union all
  -- 7) existe pelo menos um admin
  select 7, 'Administradores', case when count(*) > 0 then 'OK' else 'ATENÇÃO' end,
         case when count(*) > 0 then count(*) || ' admin: ' || string_agg(email, ', ')
              else 'nenhum: entre no app e clique em "Assumir como administradora", ou rode update public.profiles set role = ''admin'' where email = ''seu@email.com'';' end
  from public.profiles where role = 'admin'

  union all
  -- 8) clientes sem empresa vinculada (não veem nada)
  select 8, 'Clientes sem empresa', case when count(*) = 0 then 'OK' else 'ATENÇÃO' end,
         case when count(*) = 0 then '' else string_agg(email, ', ') || ' — vincule uma empresa em Clientes → Usuários' end
  from public.profiles where role = 'cliente' and organization_id is null

  union all
  -- 9) permissão de acesso das tabelas para usuários logados
  select 9, 'Acesso (GRANT) de authenticated em ' || t.nome,
         case when has_table_privilege('authenticated', 'public.' || t.nome, 'select,insert,update,delete') then 'OK' else 'ATENÇÃO' end,
         case when has_table_privilege('authenticated', 'public.' || t.nome, 'select,insert,update,delete') then '' else 'rode: grant select, insert, update, delete on public.' || t.nome || ' to authenticated;' end
  from (values ('organizations'),('profiles'),('assessments'),('kpis'),('chat_threads'),('priorities')) as t(nome)

) r
order by (situacao = 'OK'), ord, item;
