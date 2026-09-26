# LLM · skills do Copiloto Moulis

Pasta isolada do front. Tudo o que o modelo "sabe" e "faz" está aqui, em markdown editável — sem mexer em código.

```
llm/
  core.ts                      núcleo: carrega skills, redige segredos, chama OpenRouter, faz parse do JSON
  knowledge/moulis-framework.md   base de conhecimento (condensa o Manual v0.2)
  skills/_base.md              princípios comuns a todas as skills
  skills/<nome>.md             uma skill = frontmatter (output, temperature, max_tokens) + instruções
```

## Skills

| Skill | Onde aparece | Saída |
|---|---|---|
| `assist-fill` | Diagnóstico → "Preencher com IA" em cada seção | sugestões por pergunta com confiança, justificativa e trecho do relato + perguntas de follow-up |
| `review-consistency` | Wizard → Revisão | veredito, contradições, como validar, ajustes sugeridos, pontos cegos |
| `generate-insights` | Relatório → Leitura executiva | headline, resumo, forças, riscos de negócio, quick wins por domínio, roadmap 3 ondas |
| `kpi-assist` | Glossário → "Redigir com IA" / "Revisar com IA" | ficha completa ou revisão com issues e perguntas ao owner |
| `copilot` | Botão flutuante | chat em markdown |

## Como criar uma skill nova

1. Crie `skills/minha-skill.md`:
   ```md
   ---
   name: minha-skill
   description: o que faz
   output: json        # ou text
   temperature: 0.2
   max_tokens: 1500
   ---
   # instruções + formato JSON esperado
   ```
2. No front: `callSkill("minha-skill", { ...entrada })` (`src/lib/llm.ts`).

Nenhum deploy extra: a Vercel inclui `llm/**` na função (`vercel.json → includeFiles`).

## Boas práticas adotadas

- O nível de maturidade é calculado em código; a IA **sugere**, o usuário **aplica**.
- Saídas JSON com `response_format: json_object` + parse tolerante a blocos ```json.
- Tendência anti-otimismo nas instruções (na dúvida, nível mais baixo e o que faria subir).
- Redação de segredos no servidor antes de qualquer envio ao provedor.
- Modelo e fallback configuráveis por variável de ambiente.
