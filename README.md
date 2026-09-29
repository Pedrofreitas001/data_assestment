# Moulis · Assessment de Maturidade de Dados

Web app para a Moulis Advisory diagnosticar a maturidade de dados de empresas de médio porte e documentar o **glossário de KPIs** — com um copiloto de IA (OpenRouter) que ajuda a preencher, interpretar e gerar insights.

Stack: **React 19 + Vite + TypeScript** · **Supabase** (auth + Postgres com RLS) · **Vercel** (site estático + Functions para a IA). Sem VPS.

## O que tem no MVP

| Área | O que faz |
|---|---|
| **Diagnóstico** | Wizard com contexto da empresa → 8 capacidades (D1–D8) → checklists de consistência por domínio operacional → revisão. Autosave, "Não sei" como ponto cego, evidência por pergunta, score ao vivo. |
| **Motor de maturidade** | Score 0–100 (60% capacidades + 40% operação), nível 1–5, **gates** (sem owner / sem chave mestra / sem monitoramento de qualidade o nível não passa de 3), índice de confiabilidade, 11 regras de contradição entre respostas, plano 30-60-90 priorizado. |
| **Relatório** | Nível, radar, heatmap domínio × dimensão de qualidade, alertas, plano em ondas, leitura executiva por IA, anexo de respostas. Imprime em PDF. |
| **Glossário de KPIs** | Ficha completa (definição, fórmula, numerador/denominador, premissas, exclusões, granularidade, owner, steward, tabelas/caminhos, linhagem, checagens de qualidade, status de validação); biblioteca Moulis com 19 KPIs de varejo/logística; redação e revisão por IA. |
| **Clientes** (equipe) | Carteira, progresso e nível de cada cliente, comparativo de maturidade, usuários e convites. |
| **Copiloto** | Chat contextual (sabe a empresa e a tela atuais). |

A metodologia vem do `reference/Manual_Data_Governance_v0.2.docx`; o protótipo HTML original está em `reference/`.

## Rodar localmente

```bash
npm install
cp .env.example .env      # opcional — sem Supabase roda em modo demonstração
npm run dev               # http://localhost:5173 (a rota /api/llm também funciona no dev)
```

- **Sem nada configurado**: modo demonstração, com 2 empresas fictícias, dados no `localStorage`.
- **IA no modo demo**: defina `OPENROUTER_API_KEY` e `LLM_ALLOW_ANONYMOUS=true` no `.env`.

## Estrutura

```
src/model/        framework (perguntas, domínios, faixas), scoring, regras de consistência, playbook, biblioteca de KPIs
src/pages/        telas (Overview, Wizard, Result, Catalog, Glossary, Admin, …)
src/lib/          store (Supabase | localStorage), cliente da IA, snapshots para a IA
llm/              skills (markdown), base de conhecimento e núcleo OpenRouter — ver llm/README.md
api/              Vercel Functions: /api/llm e /api/admin-invite
supabase/         migration com schema + RLS
docs/             DEPLOY.md, ARQUITETURA.md
```

Para mudar perguntas, pesos ou gates, edite só `src/model/framework.ts` — formulário, score, relatório e IA se ajustam.

Deploy passo a passo: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

Guia de uso e metodologia em PDF (para compartilhar): **[docs/guia/](docs/guia/)**.
