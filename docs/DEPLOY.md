# Deploy: Supabase + Vercel + OpenRouter

**Precisa de VPS? Não.** O front é estático (CDN da Vercel), o banco/login é o Supabase e a IA roda numa Vercel Function (`/api/llm`) que chama o OpenRouter com a chave guardada só no servidor. Uma VPS só faria sentido para jobs longos (ex.: pipelines de ETL dos clientes rodando horas), que não fazem parte deste MVP.

> A chamada ao OpenRouter **tem** que passar pela função, não pelo navegador: se a chave ficar no front, qualquer pessoa copia do bundle e usa seus créditos.

## 1. Supabase (≈10 min)

1. Crie um projeto em supabase.com (região São Paulo).
2. **SQL Editor** → cole e rode `supabase/migrations/0001_init.sql`.
3. **Authentication → URL Configuration**: *Site URL* = URL da Vercel (ex.: `https://moulis-maturidade.vercel.app`); em *Redirect URLs* adicione `https://SEU-DOMINIO/**` e `http://localhost:5173/**`.
4. **Authentication → Providers → Email**: deixe habilitado. Se não quiser cadastro aberto, desligue *Allow new users to sign up* depois de criar sua conta (convites continuam funcionando).
5. Crie sua conta (pelo `/login` do app → "Criar conta", ou *Authentication → Users → Add user*).
6. **SQL Editor**: rode `supabase/seed_admin.sql` trocando o e-mail pelo seu → você vira **admin**.
7. **Project Settings → API**: copie `Project URL`, `anon public` e `service_role`.

Recomendado: configure SMTP próprio (*Authentication → SMTP*) — o SMTP padrão do Supabase tem limite baixo de e-mails por hora, o que afeta convites.

## 2. OpenRouter

1. openrouter.ai → *Keys* → crie uma chave; defina um **limite de crédito** na chave.
2. Escolha o modelo (`OPENROUTER_MODEL`). Padrão: `anthropic/claude-sonnet-4.5` (bom em JSON estruturado e português). Mais barato: `openai/gpt-4o-mini` ou `google/gemini-2.5-flash` — dá para usar como `OPENROUTER_FALLBACK_MODEL`.

## 3. Vercel

1. *Add New → Project* → importe o repositório. Framework: **Vite** (detectado; `vercel.json` já configura build, rotas da SPA e as functions).
2. **Environment Variables** (Production e Preview):

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (**só servidor**) |
| `OPENROUTER_API_KEY` | sua chave |
| `OPENROUTER_MODEL` | ex.: `anthropic/claude-sonnet-4.5` |
| `APP_URL` | URL pública do app |

3. Deploy. Depois, volte ao passo 1.3 com a URL final.

> Plano: o Hobby da Vercel é só para uso não comercial. Para uma consultoria usar com clientes, o correto é o **Pro**. O Supabase Free serve para começar (pausa após 7 dias sem uso; o Pro evita isso e tem backups).

## 4. Primeiro uso

1. Entre como admin → **Clientes → Novo cliente**.
2. **Clientes → aba Usuários → Convidar**: papel *Cliente* + empresa. O cliente recebe o e-mail, entra e define a senha em **Conta**.
3. Consultores: papel *Consultor* (veem todos os clientes, não gerenciam usuários).

## Segurança já embutida

- **RLS** no Postgres: cliente só lê/escreve a própria organização; o papel e a empresa não podem ser alterados pelo próprio usuário (trigger).
- `/api/llm` exige sessão Supabase válida, tem limite de 30 req/min por usuário e **remove padrões de segredo** (tokens, JWT, `senha=`, chaves privadas) antes de enviar ao modelo.
- O glossário e o copiloto **bloqueiam** textos que parecem senhas/tokens.
- `SUPABASE_SERVICE_ROLE_KEY` só é usada em `/api/admin-invite`, que confere se quem chamou é admin.

## Checklist pós-deploy

- [ ] Login com senha e com link mágico funcionando
- [ ] Usuário cliente vê só a própria empresa
- [ ] "Preencher com IA" responde (se der 401: sessão; 503: falta `OPENROUTER_API_KEY`)
- [ ] Relatório imprime em PDF (Ctrl/Cmd + P → Salvar como PDF)
