# Base de conhecimento — Framework Moulis de Governança de Dados (PMEs de varejo & logística)

Fonte: Manual de Atuação em Data Governance v0.2 (Moulis), cruzado com DAMA-DMBOK, DGI, DCAM e NIST.

## Premissa de contexto
- Cliente típico: PME de varejo, atacado, e-commerce ou operador logístico. Time de dados de 0 a 2 pessoas, muitas vezes terceirizado. A prioridade é a operação do dia a dia, não a governança em si.
- Dor recorrente: dados espalhados (ERP, e-commerce, WMS, TMS, CRM, planilhas), sem dono formal, sem chave de cruzamento validada e sem cultura de dados.
- Toda recomendação deve gerar valor visível rápido e evoluir de forma incremental. Nunca recomendar "comprar uma plataforma" como primeiro passo.

## Quatro pilares + metadados
Data Quality · Security & Privacy (LGPD) · Data Stewardship (papéis) · Policies & Standards (premissas, definições). Sustentados por Metadata Management (catálogo de dados + glossário de KPIs).

## Papéis (DGI)
- Data Owner: autoridade de negócio sobre o domínio; aprova premissas e prioriza. Tipicamente o gerente da área.
- Data Steward: execução — ingestão, consolidação, primeira validação de qualidade. Tipicamente analista sênior.
- Data User: consome o dado para decidir.
- Apontamento de campo: governança emperra mais por falta de OWNER do que de steward. Dado sem owner é tecnicamente correto mas sem legitimidade.

## Diagnóstico (Fase 0)
- Conduzido por área de negócio, não por sistema.
- Levanta: área e prioridade; fontes; credenciais e dificuldade de acesso; maturidade da pipeline; owners informais.
- A dificuldade técnica de ACESSO não é detalhe: credenciais perdidas e dependência de fornecedor são a causa mais comum de atraso. O gargalo raramente é analítico.
- Chave mestra de cruzamento: no varejo é o SKU, mas o problema é a falta de uma tabela de-para (DIM) única entre sistemas. A DIM é entregável formal do diagnóstico.
- Silos: mapear sem julgamento (o que contém, quem mantém, o que se perde) antes de propor fonte única.

## Maturidade de pipeline (não pular níveis)
N1 Exploratório (script pontual para validar premissas) → N2 Rotina com owner → N3 Camada ouro (banco + BI) → N4 Automação (webapp/backend quando o volume de decisão justifica) → N5 Agentic (linguagem natural sobre a camada ouro com dicionário de requisições).
Erro comum: automatizar antes de validar premissas manualmente. Um script com responsável humano entrega mais confiabilidade do que automação prematura.

## Arquitetura medallion
Bronze (bruto) → Prata (chave comum/DIM, limpeza, deduplicação — elimina "qual planilha está certa?") → Ouro (modelo de negócio, KPIs). A fonte única exige hierarquia clara de quem pode alterá-la, senão voltam as cópias paralelas.

## Qualidade de dados
Dimensões: acuracidade, completude, consistência, tempestividade, unicidade, validade.
Antes de consolidar um KPI, explicitar premissas. Consolidar indicador bonito sobre premissa errada é o risco mais caro.
Monitoramento contínuo validado em campo: dias sem venda por SKU; variação atípica dia a dia; divergência entre fontes que deveriam bater (e-commerce × ERP). Alerta sem dono é ruído.

## Segurança & LGPD
Classificar cada fonte: público interno, restrito, confidencial, pessoal (LGPD). Acesso proporcional ao risco, não à hierarquia. Documentar quem acessa cada camada. Credenciais: registrar quem tem, onde estão (cofre) e validade — NUNCA o segredo.

## Cultura
Programas falham por falta de valor percebido. Mostrar valor antes de exigir rotina; patrocínio explícito da liderança; rotina leve. Cultura é transversal desde a primeira conversa.

## Padrões de campo por área
- RGM/E-commerce: sem visão diária consolidada de venda/desconto/kit; ROI de campanha exige 3 donos (mídia, custo de produto FP&A, venda). Fontes: VTEX, Google Ads, Insider, SAC, planilhas de preço.
- Logística: visibilidade de estoque; custo de frete por transportador; gate de PCP não automatizado. Fontes: WMS, ERP, operador logístico.
- Comercial: notas bloqueadas por ruptura de 1 SKU; diário de faturamento gigante em Excel sem owner.

## Catálogo de soluções (template)
Problema recorrente · Fontes envolvidas (e dificuldade de acesso) · Chave de cruzamento · Owner/Steward típico · Maturidade de pipeline recomendada · Produto final (planilha, BI, webapp).

## Roadmap em ondas
Onda 1 (sem. 1–3): diagnóstico na área prioritária — mapa de fontes, silos, chave mestra validada.
Onda 2 (sem. 3–5): fundamentos — owners/stewards, hierarquia de acesso.
Onda 3 (sem. 5–9): pipeline N1–N3 — camada ouro + primeiro dashboard.
Onda 4 (contínua): qualidade + cultura. Onda 5 (paralela): catálogo de soluções.

## Critérios de sucesso
Todas as fontes da área prioritária mapeadas com dificuldade de acesso registrada; 100% dos domínios críticos com owner e steward nomeados; dado consolidado com rotina que não depende de alguém "lembrar"; uso espontâneo do painel pelo time.

## Níveis gerais de maturidade (assessment)
1 Inicial (0–20) · 2 Reativo (20–40) · 3 Definido (40–60) · 4 Gerenciado (60–80) · 5 Otimizado (80–100).
Regras de gate: sem owner formal, sem chave mestra validada ou sem nenhum monitoramento de qualidade, o nível atribuído não passa de 3 — mesmo que a média seja maior.
