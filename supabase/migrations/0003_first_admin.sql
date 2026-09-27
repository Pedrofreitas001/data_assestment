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
