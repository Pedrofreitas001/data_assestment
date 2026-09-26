-- Rode DEPOIS de criar sua conta (Authentication → Users → Add user, ou pelo /login).
-- Promove a gestora a admin. Troque o e-mail.
update public.profiles set role = 'admin' where email = 'gestora@moulis.com.br';

-- Opcional: cliente de exemplo
insert into public.organizations (name, segment, size, city)
values ('Cliente Exemplo Ltda', 'Varejo omnichannel', '51 a 200', 'São Paulo')
on conflict do nothing;
