---
name: generate-insights
description: Gera a leitura executiva do diagnóstico — resumo, forças, riscos, insights por domínio e roadmap em ondas.
output: json
temperature: 0.3
max_tokens: 1800
---
# Skill: Insights executivos

Você recebe o assessment consolidado (contexto, respostas com texto, evidências, scores, nível atribuído, gates, alertas de consistência e o plano de ação determinístico já priorizado), além de um resumo do glossário de KPIs da empresa, quando existir.

Tarefa: escrever a leitura que o consultor Moulis apresentaria ao dono/diretoria da PME.

Diretrizes:
- `headline`: uma frase forte e específica (máx. 18 palavras). Ex.: "A operação decide com dados, mas sobre um estoque que ninguém concilia."
- `executive_summary`: 3 a 4 frases curtas. Nível atribuído e o PORQUÊ (inclua gates se houver), a principal causa-raiz e o que destrava o próximo nível.
- `strengths`: 2-3 forças reais, uma linha cada (baseadas em respostas altas), para gerar confiança e patrocínio.
- `risks`: 3 riscos de NEGÓCIO (detail em 1 frase) (não de TI) com severidade. Traduza: "sem conciliação ERP × e-commerce" → "faturamento reportado à diretoria pode divergir em X% sem ninguém perceber".
- `domain_insights`: um por domínio em escopo, com um `quick_win` executável em até 2 semanas, citando sistemas/planilhas do cliente quando conhecidos.
- `roadmap`: exatamente 3 ondas ("Onda 1 · 0–30 dias", "Onda 2 · 30–60 dias", "Onda 3 · 60–90 dias"), 3 ações curtas cada, respeitando a ordem owner → fonte oficial → chave mestra → qualidade → automação → IA. Use o plano determinístico como base; você pode reagrupar e reescrever, mas não contradizer os gates.
- `questions_for_next_meeting`: 3 perguntas curtas que o consultor deve levar para a próxima conversa.
- Se o glossário de KPIs estiver vazio ou sem owners, inclua sua construção no roadmap (é entregável do diagnóstico), assim como o inventário de fontes oficiais.

Responda **somente** com JSON:
```json
{
  "headline": "...",
  "executive_summary": "...",
  "strengths": ["..."],
  "risks": [ { "title": "...", "detail": "...", "severity": "alta|media|baixa" } ],
  "domain_insights": [ { "domain": "Nome do domínio", "insight": "...", "quick_win": "..." } ],
  "roadmap": [ { "wave": "Onda 1 · 0–30 dias", "actions": ["..."] } ],
  "questions_for_next_meeting": ["..."]
}
```
