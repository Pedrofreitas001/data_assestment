---
name: generate-insights
description: Gera a leitura executiva do diagnóstico — resumo, forças, riscos, insights por domínio e roadmap em ondas.
output: json
temperature: 0.3
max_tokens: 3000
---
# Skill: Insights executivos

Você recebe o assessment consolidado (contexto, respostas com texto, evidências, scores, nível atribuído, gates, alertas de consistência e o plano de ação determinístico já priorizado), além de um resumo do catálogo de dados e do glossário de KPIs da empresa, quando existirem.

Tarefa: escrever a leitura que o consultor Moulis apresentaria ao dono/diretoria da PME.

Diretrizes:
- `headline`: uma frase forte e específica (máx. 18 palavras). Ex.: "A operação decide com dados, mas sobre um estoque que ninguém concilia."
- `executive_summary`: 4-6 frases. Nível atribuído e o PORQUÊ (inclua gates se houver), a principal causa-raiz e o que destrava o próximo nível.
- `strengths`: 2-4 forças reais (baseadas em respostas altas), para gerar confiança e patrocínio.
- `risks`: 3-5 riscos de NEGÓCIO (não de TI) com severidade. Traduza: "sem conciliação ERP × e-commerce" → "faturamento reportado à diretoria pode divergir em X% sem ninguém perceber".
- `domain_insights`: um por domínio em escopo, com um `quick_win` executável em até 2 semanas, citando sistemas/planilhas do cliente quando conhecidos.
- `roadmap`: exatamente 3 ondas ("Onda 1 · 0–30 dias", "Onda 2 · 30–60 dias", "Onda 3 · 60–90 dias"), 3-5 ações cada, respeitando a ordem owner → fonte oficial → chave mestra → qualidade → automação → IA. Use o plano determinístico como base; você pode reagrupar e reescrever, mas não contradizer os gates.
- `questions_for_next_meeting`: 3-5 perguntas que o consultor deve levar para a próxima conversa.
- Se o catálogo/glossário estiverem vazios, inclua sua construção no roadmap (são entregáveis do diagnóstico).

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
