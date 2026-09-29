# Base de conhecimento — Framework Moulis de Governança de Dados (empresas de médio porte, qualquer setor)

Fonte: Manual de Atuação em Data Governance v0.2 (Moulis), cruzado com DAMA-DMBOK, DGI, DCAM v3, NIST, Data Orchard e o UK Data Maturity Assessment.

## Premissa de contexto
- Cliente típico: empresa de médio porte pouco madura em dados — comércio, indústria, serviços, logística, saúde, educação. Time de dados de 0 a 2 pessoas, muitas vezes acumulado com outra função ou terceirizado. A prioridade é a operação do dia a dia, não a governança em si.
- Dor recorrente: dados espalhados (ERP, CRM, folha, sistema da operação, planilhas), sem dono formal, sem código comum entre sistemas e sem cultura de dados.
- Use exemplos do setor do cliente (campo `segmento` do contexto). Não use jargão de varejo (SKU, CD, loja) com quem não é do varejo.
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
- Código comum entre sistemas (chave mestra): cliente, produto/serviço, fornecedor ou colaborador. O problema é a falta de uma tabela de correspondência única entre sistemas — ela é entregável formal do diagnóstico. Se a empresa usa um único sistema, a pergunta "não se aplica".
- Silos: mapear sem julgamento (o que contém, quem mantém, o que se perde) antes de propor fonte única.

## Maturidade de pipeline (não pular níveis)
N1 Exploratório (script pontual para validar premissas) → N2 Rotina com owner → N3 Camada ouro (banco + BI) → N4 Automação (webapp/backend quando o volume de decisão justifica) → N5 Agentic (linguagem natural sobre a camada ouro com dicionário de requisições).
Erro comum: automatizar antes de validar premissas manualmente. Um script com responsável humano entrega mais confiabilidade do que automação prematura.

## Arquitetura medallion
Bronze (bruto) → Prata (chave comum/DIM, limpeza, deduplicação — elimina "qual planilha está certa?") → Ouro (modelo de negócio, KPIs). A fonte única exige hierarquia clara de quem pode alterá-la, senão voltam as cópias paralelas.

## Qualidade de dados
Dimensões: acuracidade, completude, consistência, tempestividade, unicidade, validade.
Antes de consolidar um KPI, explicitar premissas. Consolidar indicador bonito sobre premissa errada é o risco mais caro.
Conferências simples que funcionam em qualquer setor: registros faltando, valores fora do padrão, divergência entre duas fontes que deveriam bater. Alerta sem dono é ruído. Erro corrigido só no relatório volta no mês seguinte — corrigir na origem.

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

## Questionário (versão 3)
- 8 capacidades, 26 perguntas, todas com 4 níveis: 1 inexistente · 2 informal/depende de pessoas · 3 definido (documentado, com responsável) · 4 gerenciado (medido, automatizado, revisado).
- D1 Estratégia & Uso (uso nas decisões, meta/patrocinador/orçamento, avaliação de resultado) · D2 Fontes (fonte oficial, onde ficam, acesso, backup) · D3 Qualidade (confiança — percepção, conferência recorrente, correção na origem) · D4 Integração (código comum, consolidação, origem dos indicadores) · D5 Governança (responsável de negócio, definição escrita, resolução de divergências) · D6 Segurança (acessos, classificação, LGPD) · D7 Pessoas (capacidade do time, letramento dos gestores, dependência de pessoa-chave, adoção) · D8 Automação & IA (automação, regras de uso de IA, dados para IA).
- Áreas: núcleo universal (Comercial & Clientes, Financeiro, Pessoas & RH, Operações & Entrega, Compras, Cadastros) + módulos por setor (Estoque, Logística, E-commerce, Produção & Qualidade, Projetos & Horas). Cada checagem tem "Não se aplica".
- Contexto informa: segmento, quem cuida de dados (ninguém, acumula, 1 pessoa, time, externo), objetivo principal (confiar nos números, reduzir trabalho manual, visão integrada, reduzir riscos, crescer/IA), sistemas e dores.

## Próximos passos (plano)
- Cada resposta abaixo do ideal gera o passo que leva ao PRÓXIMO nível daquela pergunta (não ao ideal). "Não sei" gera um passo de descoberta.
- Cada passo tem: por quê (ligado à resposta), como fazer (3 passos), entregável, quem conduz, esforço, prazo típico e critério de pronto.
- Onda 1 (0–30 dias): o que limita o nível + fundamentos críticos; tamanho conforme a capacidade (3 passos se ninguém cuida de dados, até 5 com time). Onda 2 (30–60): estrutura. Onda 3 (60–90): escala.
- O perfil da empresa (ex.: "Muitos números, pouca confiança", "Refém de pessoas e planilhas") resume a situação e o foco. Use-o para explicar o plano.
- Ao sugerir como executar um passo, seja concreto para a empresa: cite os sistemas informados, a área e um primeiro movimento que caiba numa semana.

## Critérios de sucesso
Todas as fontes da área prioritária mapeadas com dificuldade de acesso registrada; 100% dos domínios críticos com owner e steward nomeados; dado consolidado com rotina que não depende de alguém "lembrar"; uso espontâneo do painel pelo time.

## Níveis gerais de maturidade (assessment)
1 Inicial (0–20) · 2 Reativo (20–40) · 3 Definido (40–60) · 4 Gerenciado (60–80) · 5 Otimizado (80–100).
Regras de gate: sem owner formal, sem chave mestra validada ou sem nenhum monitoramento de qualidade, o nível atribuído não passa de 3 — mesmo que a média seja maior.
