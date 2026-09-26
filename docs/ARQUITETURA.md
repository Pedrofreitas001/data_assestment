# Arquitetura

```
Navegador (React SPA)
  ├── Supabase JS ──► Supabase Auth + Postgres (RLS por organização)
  └── fetch /api/llm (Bearer JWT) ──► Vercel Function ──► OpenRouter
                                       ├─ valida JWT no Supabase
                                       ├─ remove segredos da entrada
                                       └─ monta prompt: _base + conhecimento + skill
```

## Modelo de dados (espelha o Cap. 10 do manual)

- `organizations` — clientes da consultoria
- `profiles` — usuário ↔ papel (`admin` | `consultor` | `cliente`) ↔ organização
- `assessments` — contexto, respostas (jsonb), evidências, insights da IA; `score`/`level` desnormalizados para o painel
- `data_assets` — catálogo (tipo, camada, owner, steward, sensibilidade, pipeline N1–N5, `upstream[]` = linhagem)
- `credentials` — governança de acessos (sem segredo)
- `kpis` — glossário (definição, fórmula, premissas, owner, tabelas, `asset_ids[]`)

## Lógica de maturidade (determinística, em `src/model/`)

A IA **não** calcula o nível — o cálculo é auditável e fica em código:

1. Cada resposta vira 0–100; "Não sei" = 0 e conta como ponto cego.
2. Dimensões ponderadas → índice de capacidades; checklists por domínio → índice de operação; geral = 60/40.
3. **Gates** fundacionais limitam o nível (lógica DCAM de não pular etapa).
4. **Regras de consistência** detectam respostas contraditórias.
5. **Plano de ação** prioriza lacuna × peso × criticidade e distribui em ondas.

A IA entra por cima disso: sugere respostas a partir de relatos (usuário aprova), revisa a consistência como um consultor sênior e escreve a leitura executiva.

## Modo demonstração

Sem `VITE_SUPABASE_*`, `src/lib/store.ts` usa localStorage com o mesmo contrato do Supabase — útil para apresentar a ferramenta antes do setup.
