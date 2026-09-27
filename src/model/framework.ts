// =====================================================================
// FRAMEWORK DE MATURIDADE — Moulis
// Duas lentes complementares, derivadas do Manual de Data Governance v0.2:
//  1. CAPACIDADES (8 dimensões, inspiradas em DAMA-DMBOK / DCAM / DGI)
//     → "a empresa TEM a estrutura para gerir dados?"
//  2. DOMÍNIOS OPERACIONAIS (varejo & logística) com checklists de
//     CONSISTÊNCIA, cada item marcado com uma dimensão de qualidade
//     → "o dado da operação BATE com a realidade?"
// Editar este arquivo muda o questionário inteiro (form, score, IA).
// =====================================================================

export type QualityDim =
  | "acuracidade"
  | "completude"
  | "consistencia"
  | "tempestividade"
  | "unicidade"
  | "validade";

export const QUALITY_DIMS: { key: QualityDim; label: string; question: string }[] = [
  { key: "acuracidade", label: "Acuracidade", question: "O dado reflete a realidade física/operacional?" },
  { key: "completude", label: "Completude", question: "Há lacunas (dias, SKUs, lojas) e elas estão sinalizadas?" },
  { key: "consistencia", label: "Consistência", question: "O mesmo conceito dá o mesmo número em fontes diferentes?" },
  { key: "tempestividade", label: "Tempestividade", question: "O dado chega a tempo de decidir?" },
  { key: "unicidade", label: "Unicidade", question: "Cada entidade (SKU, cliente, pedido) existe uma única vez?" },
  { key: "validade", label: "Validade", question: "O dado respeita formato e regra de negócio?" },
];

export interface LevelOption {
  v: number;
  label: string;
}

export interface Question {
  id: string;
  prompt: string;
  help?: string;
  levels: LevelOption[];
  weight?: number;
  /** Fundacional: pontuação baixa aqui limita o nível geral (não se pula etapa). */
  gate?: { belowOrEqual: number; capLevel: number; reason: string };
}

export interface Dimension {
  key: string;
  code: string;
  title: string;
  description: string;
  refs: string;
  weight: number;
  questions: Question[];
}

export interface DomainCheck {
  id: string;
  prompt: string;
  quality: QualityDim;
  help?: string;
  action: string;
  critical?: boolean;
}

export interface OpDomain {
  key: string;
  title: string;
  description: string;
  typicalSources: string[];
  kpis: string[];
  checks: DomainCheck[];
}

/** Valor 0 = "Não sei" — pontua zero e vira ponto cego no relatório. */
export const UNKNOWN = 0;

export const DIMENSIONS: Dimension[] = [
  {
    key: "estrategia",
    code: "D1",
    title: "Estratégia & Uso Analítico",
    description: "O quanto a empresa usa dados para decidir — não só para reportar o que já aconteceu.",
    refs: "DAMA · Data Warehousing & BI",
    weight: 1,
    questions: [
      {
        id: "est_uso",
        prompt: "Qual o uso mais avançado de dados que acontece de forma recorrente hoje?",
        levels: [
          { v: 1, label: "Não há uso estruturado — decisões por experiência" },
          { v: 2, label: "Relatórios pontuais, quando alguém pede" },
          { v: 3, label: "KPIs acompanhados em rotina fixa (semanal/mensal)" },
          { v: 4, label: "Dados embasam decisões táticas do dia a dia (reposição, preço, rota)" },
          { v: 5, label: "Planejamento, cenários e projeções (forecast, S&OP)" },
        ],
      },
      {
        id: "est_producao",
        prompt: "Como os relatórios e análises são produzidos?",
        levels: [
          { v: 1, label: "Manual, direto em planilha, a cada vez" },
          { v: 2, label: "Planilhas com fórmulas/macros reaproveitadas" },
          { v: 3, label: "BI com painel simples, atualizado manualmente" },
          { v: 4, label: "BI conectado a múltiplas fontes, atualização agendada" },
          { v: 5, label: "Self-service governado + modelos analíticos na rotina" },
        ],
      },
      {
        id: "est_prioridade",
        prompt: "Existem objetivos de negócio explicitamente ligados a iniciativas de dados?",
        help: "Ex.: 'reduzir ruptura em 20%' depende de um painel de estoque confiável.",
        levels: [
          { v: 1, label: "Não — dados são vistos como tarefa de TI" },
          { v: 2, label: "Há intenção, mas sem metas ou orçamento" },
          { v: 3, label: "Algumas iniciativas com meta e patrocinador" },
          { v: 4, label: "Roadmap de dados priorizado pela diretoria, revisado periodicamente" },
        ],
      },
    ],
  },
  {
    key: "fontes",
    code: "D2",
    title: "Fontes & Infraestrutura",
    description: "Onde o dado mora, se as fontes oficiais são conhecidas e se há acesso estável a elas.",
    refs: "DAMA · Arquitetura, Armazenamento & Operações",
    weight: 1,
    questions: [
      {
        id: "fnt_oficial",
        prompt: "Está claro qual é a fonte oficial de cada informação crítica (venda, estoque, custo, frete)?",
        levels: [
          { v: 1, label: "Não — cada um usa a planilha que acha melhor" },
          { v: 2, label: "Depende de quem você pergunta" },
          { v: 3, label: "Sim, é conhecido por todos, mas não está documentado" },
          { v: 4, label: "Sim, documentado em catálogo/inventário de fontes" },
        ],
      },
      {
        id: "fnt_arquitetura",
        prompt: "Onde os dados consolidados são armazenados?",
        levels: [
          { v: 1, label: "Não há consolidação — só os sistemas de origem" },
          { v: 2, label: "Planilhas em pastas/drive compartilhado" },
          { v: 3, label: "Banco de dados único (ex.: PostgreSQL/SQL Server) alimentado manualmente" },
          { v: 4, label: "Banco/Data warehouse com cargas automáticas" },
          { v: 5, label: "Camadas bronze/prata/ouro com rotinas monitoradas" },
        ],
      },
      {
        id: "fnt_acesso",
        prompt: "Qual a dificuldade de extrair dados dos sistemas principais (ERP, WMS, e-commerce)?",
        help: "O manual aponta: o gargalo costuma ser de acesso, não analítico.",
        levels: [
          { v: 1, label: "Só por relatório/exportação manual da tela" },
          { v: 2, label: "Depende do fornecedor ou de uma pessoa específica de TI" },
          { v: 3, label: "Temos API/consulta para parte das fontes" },
          { v: 4, label: "Acesso via API/banco documentado para todas as fontes críticas" },
        ],
      },
    ],
  },
  {
    key: "qualidade",
    code: "D3",
    title: "Qualidade de Dados",
    description: "Acuracidade, completude e consistência tratadas como rotina — não como incêndio.",
    refs: "DAMA · Data Quality · Manual Cap. 6",
    weight: 1.3,
    questions: [
      {
        id: "qual_confianca",
        prompt: "Qual o nível de confiança nos números usados para decidir?",
        levels: [
          { v: 1, label: "Muito baixo — não confiamos nos números" },
          { v: 2, label: "Baixo — inconsistências são frequentes" },
          { v: 3, label: "Médio — funciona, mas tudo é conferido antes de usar" },
          { v: 4, label: "Alto — problemas são raros e detectados cedo" },
          { v: 5, label: "Muito alto — qualidade medida e com meta" },
        ],
      },
      {
        id: "qual_monitor",
        prompt: "Existe monitoramento recorrente de qualidade (ex.: dias sem venda por SKU, variação atípica, divergência entre fontes)?",
        levels: [
          { v: 1, label: "Não — erros são descobertos por quem usa o relatório" },
          { v: 2, label: "Checagens manuais esporádicas" },
          { v: 3, label: "Checagens definidas e executadas em rotina, com responsável" },
          { v: 4, label: "Alertas automáticos com dono e prazo de correção" },
        ],
        gate: { belowOrEqual: 1, capLevel: 3, reason: "Sem nenhum monitoramento de qualidade, a maturidade não passa de 'Definido'." },
      },
      {
        id: "qual_premissas",
        prompt: "As premissas por trás dos indicadores (o que entra, o que sai, quando fecha) estão explícitas?",
        levels: [
          { v: 1, label: "Não — cada um calcula do seu jeito" },
          { v: 2, label: "Estão na cabeça de quem montou a planilha" },
          { v: 3, label: "Documentadas para parte dos KPIs" },
          { v: 4, label: "Documentadas e validadas pelo owner para os KPIs críticos" },
        ],
      },
    ],
  },
  {
    key: "integracao",
    code: "D4",
    title: "Integração & Dados Mestres",
    description: "Capacidade de cruzar fontes com uma chave validada (SKU, cliente, fornecedor) e cadastro mestre único.",
    refs: "DAMA · Integração, Dados Mestres & Referência · Manual Cap. 3.3",
    weight: 1.2,
    questions: [
      {
        id: "int_chave",
        prompt: "Existe uma tabela mestra de-para (DIM) que conecta o SKU/produto entre ERP, e-commerce, WMS e planilhas?",
        levels: [
          { v: 1, label: "Não — cada sistema tem seu código e não conversam" },
          { v: 2, label: "Existe parcialmente, mantida por alguém em planilha" },
          { v: 3, label: "Existe e cobre as fontes principais, com responsável" },
          { v: 4, label: "Cadastro mestre único, com regra de criação e validação" },
        ],
        gate: { belowOrEqual: 2, capLevel: 3, reason: "Sem chave mestra de-para validada, qualquer cruzamento entre áreas fica sujeito a erro silencioso." },
      },
      {
        id: "int_consol",
        prompt: "Quando é preciso combinar dados de mais de uma fonte, como é feito?",
        levels: [
          { v: 1, label: "Não combina — cada fonte é usada isoladamente" },
          { v: 2, label: "Copiar e colar entre planilhas" },
          { v: 3, label: "Semi-automático (Power Query, PROCV entre bases)" },
          { v: 4, label: "Pipeline/ETL automático, mas cada fonte com suas definições" },
          { v: 5, label: "Pipeline automático com regras padronizadas — fonte única da verdade" },
        ],
      },
      {
        id: "int_linhagem",
        prompt: "Para os indicadores críticos, sabe-se de onde vem o dado, como é transformado e onde é consumido (linhagem)?",
        levels: [
          { v: 1, label: "Não" },
          { v: 2, label: "Informalmente, na cabeça de alguém" },
          { v: 3, label: "Documentado para alguns indicadores" },
          { v: 4, label: "Documentado e atualizado para todos os críticos" },
        ],
      },
    ],
  },
  {
    key: "governanca",
    code: "D5",
    title: "Governança & Ownership",
    description: "Quem decide sobre cada dado, com que autoridade, e se isso está documentado.",
    refs: "DGI · Direitos de decisão · Manual Cap. 4",
    weight: 1.2,
    questions: [
      {
        id: "gov_owner",
        prompt: "Os domínios de dados críticos têm Data Owner (negócio) e Data Steward (execução) definidos?",
        help: "Owner aprova premissas e prioriza; Steward ingere, consolida e faz a primeira validação.",
        levels: [
          { v: 1, label: "Ninguém é claramente responsável" },
          { v: 2, label: "Dono informal — todos sabem a quem recorrer, mas não é formal" },
          { v: 3, label: "Owner formal, sem steward/backup" },
          { v: 4, label: "Owner e steward formalizados para os domínios críticos" },
        ],
        gate: { belowOrEqual: 2, capLevel: 3, reason: "Sem owner formal, o dado pode estar tecnicamente correto mas sem legitimidade para decisão." },
      },
      {
        id: "gov_glossario",
        prompt: "Existe um glossário/dicionário de KPIs com definição, fórmula e dono?",
        levels: [
          { v: 1, label: "Não existe" },
          { v: 2, label: "Existe parcial ou desatualizado" },
          { v: 3, label: "Existe para os KPIs principais" },
          { v: 4, label: "Existe, é mantido e consultado pelas áreas" },
        ],
      },
      {
        id: "gov_processo",
        prompt: "Os processos críticos de dados (fechamentos, cargas, correções de cadastro) estão documentados?",
        levels: [
          { v: 1, label: "Não estão documentados" },
          { v: 2, label: "Parcialmente documentados" },
          { v: 3, label: "Documentados e atualizados" },
        ],
      },
    ],
  },
  {
    key: "seguranca",
    code: "D6",
    title: "Segurança, Acesso & LGPD",
    description: "Credenciais sob controle, acesso proporcional ao risco e dados pessoais tratados conforme a LGPD.",
    refs: "NIST · DAMA Segurança · Manual Cap. 4.2",
    weight: 1,
    questions: [
      {
        id: "seg_cred",
        prompt: "As credenciais de acesso aos sistemas e APIs (quem tem, onde estão, quando expiram) estão sob controle?",
        help: "Nunca registre senhas no assessment — apenas onde estão guardadas e quem responde.",
        levels: [
          { v: 1, label: "Ninguém sabe ao certo onde estão ou quem tem" },
          { v: 2, label: "Estão com pessoas específicas, em e-mails/planilhas" },
          { v: 3, label: "Inventariadas, com responsável, em local controlado" },
          { v: 4, label: "Em cofre de senhas, com rotação e revogação no desligamento" },
        ],
      },
      {
        id: "seg_acesso",
        prompt: "O acesso aos dados segue a sensibilidade da informação?",
        levels: [
          { v: 1, label: "Todos acessam tudo (ou ninguém acessa nada)" },
          { v: 2, label: "Controle por sistema, sem classificação dos dados" },
          { v: 3, label: "Dados classificados (público interno, restrito, pessoal) com acesso proporcional" },
          { v: 4, label: "Classificação + revisão periódica de acessos + logs" },
        ],
      },
      {
        id: "seg_lgpd",
        prompt: "Dados pessoais (CPF, endereço, telefone de clientes/motoristas) são mapeados e tratados conforme a LGPD?",
        levels: [
          { v: 1, label: "Não sabemos onde estão os dados pessoais" },
          { v: 2, label: "Sabemos onde estão, mas sem controles específicos" },
          { v: 3, label: "Mapeados, com base legal e acesso restrito" },
          { v: 4, label: "Mapeados, com DPO/encarregado, retenção e resposta a titulares" },
        ],
      },
    ],
  },
  {
    key: "pessoas",
    code: "D7",
    title: "Pessoas & Cultura",
    description: "Habilidade analítica do time, dependência de pessoas-chave e adoção da rotina de dados.",
    refs: "Manual Cap. 7 · Change Management",
    weight: 0.9,
    questions: [
      {
        id: "pes_skill",
        prompt: "Qual a habilidade analítica predominante no time que produz os números?",
        levels: [
          { v: 1, label: "Excel básico" },
          { v: 2, label: "Excel avançado / BI básico" },
          { v: 3, label: "SQL e BI avançado" },
          { v: 4, label: "Python/R + SQL" },
          { v: 5, label: "Ciência de dados e modelagem estatística" },
        ],
      },
      {
        id: "pes_dependencia",
        prompt: "Se a pessoa que mais conhece os dados saísse amanhã, o que aconteceria?",
        levels: [
          { v: 1, label: "Problema sério — o conhecimento está só com ela" },
          { v: 2, label: "Levaria semanas para reconstruir" },
          { v: 3, label: "Há documentação básica que ajudaria" },
          { v: 4, label: "Conhecimento distribuído e documentado" },
        ],
      },
      {
        id: "pes_adocao",
        prompt: "Os painéis e rotinas de dados são usados espontaneamente pelas áreas?",
        levels: [
          { v: 1, label: "Não — ninguém abre sem cobrança" },
          { v: 2, label: "Poucos usam, geralmente a liderança" },
          { v: 3, label: "Usados em reuniões de rotina" },
          { v: 4, label: "Parte natural do dia a dia das equipes" },
        ],
      },
    ],
  },
  {
    key: "ia",
    code: "D8",
    title: "Automação & Prontidão para IA",
    description: "Quanto do trabalho com dados já é automatizado e se a base sustenta casos de uso de IA.",
    refs: "Manual Cap. 5.2 (níveis 4–5) · Anexo A",
    weight: 0.8,
    questions: [
      {
        id: "ia_automacao",
        prompt: "Quantas rotinas de dados (cargas, relatórios, conciliações) são automatizadas?",
        levels: [
          { v: 1, label: "Nenhuma" },
          { v: 2, label: "Poucas, pontuais" },
          { v: 3, label: "Boa parte" },
          { v: 4, label: "A maioria das críticas, com monitoramento" },
        ],
      },
      {
        id: "ia_uso",
        prompt: "O que existe hoje de IA aplicada à operação?",
        levels: [
          { v: 1, label: "Nada" },
          { v: 2, label: "Uso individual de ferramentas (ChatGPT etc.) sem processo" },
          { v: 3, label: "Pilotos em casos específicos (previsão de demanda, atendimento)" },
          { v: 4, label: "Casos em produção, com dados governados por trás" },
        ],
      },
      {
        id: "ia_dados",
        prompt: "Os dados necessários para os casos de IA desejados estão disponíveis e com qualidade?",
        levels: [
          { v: 1, label: "Não" },
          { v: 2, label: "Parcialmente" },
          { v: 3, label: "Sim, para os casos priorizados" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------
// DOMÍNIOS OPERACIONAIS — checklists de consistência (varejo & logística)
// Resposta: 0 Não sei · 1 Não · 2 Parcial/às vezes · 3 Sim, com controle
// ---------------------------------------------------------------------
export const CHECK_OPTIONS: LevelOption[] = [
  { v: 1, label: "Não" },
  { v: 2, label: "Parcial / às vezes" },
  { v: 3, label: "Sim, com controle recorrente" },
];

export const DOMAINS: OpDomain[] = [
  {
    key: "comercial",
    title: "Comercial & Vendas",
    description: "Faturamento, pedidos, preço, desconto e carteira de clientes.",
    typicalSources: ["ERP (faturamento)", "PDV", "Planilha de metas", "CRM"],
    kpis: ["faturamento_liquido", "ticket_medio", "margem_bruta"],
    checks: [
      { id: "com_fat_bate", quality: "consistencia", critical: true, prompt: "O faturamento do ERP bate com o do BI/relatório gerencial no fechamento do mês?", action: "Criar conciliação mensal ERP × BI com tolerância definida (ex.: 0,5%) e registrar a causa de cada divergência." },
      { id: "com_devolucao", quality: "validade", prompt: "Devoluções, cancelamentos e bonificações são tratados com a mesma regra em todos os relatórios?", action: "Documentar no glossário a regra de 'faturamento líquido' (o que deduz, em que data) e aplicá-la em todas as fontes." },
      { id: "com_preco", quality: "acuracidade", prompt: "Existe histórico confiável de preço praticado e desconto por SKU/dia?", action: "Versionar a tabela de preço (vigência início/fim) em vez de sobrescrever a planilha." },
      { id: "com_cliente_dup", quality: "unicidade", prompt: "O cadastro de clientes é livre de duplicidades (mesmo CNPJ/CPF com códigos diferentes)?", action: "Rodar deduplicação por CNPJ/CPF e travar a criação de cadastro sem validação de documento." },
    ],
  },
  {
    key: "estoque",
    title: "Estoque & Inventário",
    description: "Saldo, posição por local, aging, ruptura e cobertura.",
    typicalSources: ["ERP (saldo contábil)", "WMS (saldo físico)", "Inventários cíclicos"],
    kpis: ["acuracidade_inventario", "ruptura", "cobertura_estoque", "giro_estoque", "aging_estoque"],
    checks: [
      { id: "est_acuracidade", quality: "acuracidade", critical: true, prompt: "A acuracidade de inventário (físico × sistema) é medida por contagem cíclica?", action: "Implantar contagem cíclica por curva ABC (A mensal, B trimestral, C semestral) e publicar a acuracidade como KPI." },
      { id: "est_erp_wms", quality: "consistencia", critical: true, prompt: "O saldo do ERP e o saldo do WMS/controle físico são conciliados rotineiramente?", action: "Conciliação diária ERP × WMS por SKU/local com relatório de divergências e responsável pela correção." },
      { id: "est_negativo", quality: "validade", prompt: "O sistema impede ou sinaliza estoque negativo?", action: "Bloquear saída sem saldo ou gerar alerta diário de SKUs negativos para o steward de estoque." },
      { id: "est_ruptura", quality: "completude", prompt: "Rupturas (dias sem estoque/sem venda por SKU) são registradas, não apenas percebidas?", action: "Gerar série diária de estoque por SKU/loja para medir dias de ruptura e venda perdida estimada." },
      { id: "est_atualizacao", quality: "tempestividade", prompt: "A posição de estoque disponível para decisão tem no máximo 24h de defasagem?", action: "Agendar carga automática de saldos (D-1 no mínimo) e exibir a data de atualização em todo painel." },
    ],
  },
  {
    key: "compras",
    title: "Compras & Suprimentos",
    description: "Pedidos de compra, fornecedores, lead time e custo de aquisição.",
    typicalSources: ["ERP (compras)", "Portal de fornecedores", "Planilha de follow-up"],
    kpis: ["lead_time_fornecedor", "fill_rate_fornecedor"],
    checks: [
      { id: "cmp_leadtime", quality: "completude", prompt: "O lead time real de cada fornecedor (pedido → recebimento) é registrado?", action: "Capturar data de pedido e data de recebimento no ERP e calcular lead time real × prometido." },
      { id: "cmp_custo", quality: "acuracidade", critical: true, prompt: "O custo unitário por SKU usado na margem é o custo real atualizado (inclui frete, impostos)?", action: "Definir com FP&A a regra de custo (médio, reposição, landed cost) e a frequência de atualização." },
      { id: "cmp_fornecedor_dup", quality: "unicidade", prompt: "Fornecedores têm cadastro único e padronizado?", action: "Deduplicar por CNPJ e padronizar razão social/condições comerciais no cadastro mestre." },
      { id: "cmp_recebimento", quality: "consistencia", prompt: "Pedido de compra, nota fiscal e recebimento físico são confrontados (3-way match)?", action: "Implantar conferência pedido × NF × recebimento com registro de divergências por fornecedor." },
    ],
  },
  {
    key: "logistica",
    title: "Logística & Transporte",
    description: "Armazenagem, expedição, frete, prazo de entrega e OTIF.",
    typicalSources: ["WMS", "TMS", "Operador logístico", "CT-e / faturas de frete", "Rastreio de transportadoras"],
    kpis: ["otif", "lead_time_entrega", "custo_frete_receita", "produtividade_separacao"],
    checks: [
      { id: "log_otif_regra", quality: "validade", critical: true, prompt: "O OTIF é calculado com regra definida (data prometida × data de entrega real, quantidade completa)?", action: "Formalizar a regra de OTIF no glossário (qual data prometida, tolerância, entregas parciais) e aplicá-la a todas as transportadoras." },
      { id: "log_frete_conc", quality: "consistencia", prompt: "O frete cotado/contratado é conciliado com o CT-e e a fatura da transportadora?", action: "Auditoria de frete: tabela contratada × CT-e × fatura, com relatório de cobranças indevidas." },
      { id: "log_entrega_real", quality: "completude", prompt: "A data de entrega real é capturada para todos os pedidos (não só os reclamados)?", action: "Integrar o rastreio das transportadoras (API/EDI) ou exigir comprovante de entrega digital." },
      { id: "log_status", quality: "tempestividade", prompt: "O status dos pedidos em trânsito é visível em tempo hábil para agir sobre atrasos?", action: "Painel diário de pedidos em trânsito com alerta de atraso por transportadora." },
      { id: "log_cadastro", quality: "acuracidade", prompt: "Peso, dimensões e embalagem dos SKUs estão corretos no cadastro (base para frete e armazenagem)?", action: "Campanha de recadastro logístico (cubagem) começando pelos SKUs curva A." },
    ],
  },
  {
    key: "ecommerce",
    title: "E-commerce & Marketing",
    description: "Pedidos online, marketplaces, campanhas, mídia e atendimento.",
    typicalSources: ["VTEX / Shopify / Nuvemshop", "Marketplaces", "Google Ads / Meta", "SAC (Zendesk)"],
    kpis: ["conversao", "roi_campanha", "taxa_devolucao"],
    checks: [
      { id: "ecm_pedidos_erp", quality: "consistencia", critical: true, prompt: "Pedidos da loja online/marketplaces batem com os pedidos faturados no ERP?", action: "Conciliação diária plataforma × ERP por nº de pedido, com fila de pedidos não integrados." },
      { id: "ecm_sku_map", quality: "unicidade", prompt: "Os SKUs da plataforma e dos marketplaces estão mapeados 1:1 com o SKU do ERP (incluindo kits)?", action: "Incluir a plataforma e cada marketplace na tabela de-para mestre; tratar kits como composição de SKUs." },
      { id: "ecm_roi", quality: "completude", prompt: "Custo de mídia, custo de produto e receita são cruzáveis por campanha para calcular ROI?", action: "Padronizar UTMs/IDs de campanha e trazer custo de produto (FP&A) para a mesma chave." },
      { id: "ecm_estoque_sync", quality: "tempestividade", prompt: "O estoque publicado nos canais é sincronizado com o disponível real?", action: "Sincronização automática de estoque com reserva de segurança por canal." },
    ],
  },
  {
    key: "financeiro",
    title: "Financeiro & FP&A",
    description: "Custos, margens, DRE gerencial e orçamento.",
    typicalSources: ["ERP (contábil/financeiro)", "Planilhas de orçamento", "Bancos / conciliação"],
    kpis: ["margem_bruta", "gmroi", "custo_frete_receita"],
    checks: [
      { id: "fin_dre", quality: "consistencia", critical: true, prompt: "A DRE gerencial reconcilia com a contabilidade (mesma receita, mesmo CMV)?", action: "Ponte mensal DRE gerencial × contábil com as diferenças explicadas (regime, rateios, ajustes)." },
      { id: "fin_rateio", quality: "validade", prompt: "Critérios de rateio (frete, despesas comuns) são documentados e estáveis?", action: "Documentar critérios de rateio e versionar qualquer mudança para não quebrar séries históricas." },
      { id: "fin_fechamento", quality: "tempestividade", prompt: "O fechamento gerencial sai em até 5 dias úteis?", action: "Mapear o caminho crítico do fechamento e automatizar as extrações que mais consomem tempo." },
      { id: "fin_orcado", quality: "completude", prompt: "Orçado × realizado está disponível na mesma granularidade (loja, canal, categoria)?", action: "Alinhar a granularidade do orçamento com a do realizado desde a elaboração do budget." },
    ],
  },
  {
    key: "cadastro",
    title: "Cadastro & Dados Mestres",
    description: "Produto, hierarquia mercadológica, unidades e códigos fiscais.",
    typicalSources: ["ERP (cadastro de produtos)", "PIM / planilha de cadastro", "Tabela DIM de-para"],
    kpis: ["completude_cadastro"],
    checks: [
      { id: "cad_regra", quality: "validade", critical: true, prompt: "Existe regra e responsável para criar/alterar SKU (campos obrigatórios, aprovação)?", action: "Fluxo de criação de SKU com checklist de campos obrigatórios e aprovação do owner de cadastro." },
      { id: "cad_hierarquia", quality: "consistencia", prompt: "A hierarquia de produto (departamento, categoria, linha) é a mesma em todos os sistemas e relatórios?", action: "Definir hierarquia mercadológica oficial na DIM e referenciá-la em todos os relatórios." },
      { id: "cad_completo", quality: "completude", prompt: "Os SKUs ativos têm cadastro completo (NCM, EAN, peso, custo, categoria)?", action: "Medir % de completude do cadastro por campo e atacar os SKUs curva A primeiro." },
      { id: "cad_unidade", quality: "acuracidade", prompt: "Unidades de medida e fatores de conversão (caixa × unidade) estão corretos?", action: "Auditar fatores de conversão dos SKUs com maior divergência de estoque." },
    ],
  },
];

export const ALL_QUESTIONS = DIMENSIONS.flatMap((d) => d.questions.map((q) => ({ ...q, dim: d })));
export const ALL_CHECKS = DOMAINS.flatMap((d) => d.checks.map((c) => ({ ...c, domain: d })));

export function findQuestion(id: string) {
  return ALL_QUESTIONS.find((q) => q.id === id);
}
export function findCheck(id: string) {
  return ALL_CHECKS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------
// Faixas de maturidade (1–5). Paleta monocromática: quanto mais maduro,
// mais escuro — coerente com a identidade preto/branco/cinza da Moulis.
// ---------------------------------------------------------------------
export interface Band {
  level: number;
  label: string;
  min: number;
  max: number;
  summary: string;
  color: string;
  soft: string;
  fg: string;
}

export const BANDS: Band[] = [
  { level: 1, label: "Inicial", min: 0, max: 20, summary: "Dados dispersos, sem dono e sem rotina. Decisões por experiência.", color: "#e5484d", soft: "#fdecec", fg: "#ffffff" },
  { level: 2, label: "Reativo", min: 20, max: 40, summary: "Relatórios existem, mas dependem de pessoas e de retrabalho manual.", color: "#f76b15", soft: "#fff0e5", fg: "#ffffff" },
  { level: 3, label: "Definido", min: 40, max: 60, summary: "Fontes e KPIs conhecidos, com rotina; ainda frágil em integração e qualidade.", color: "#f5a524", soft: "#fff6e0", fg: "#3d2800" },
  { level: 4, label: "Gerenciado", min: 60, max: 80, summary: "Dados consolidados, com owners, monitoramento e uso tático recorrente.", color: "#2fa36b", soft: "#e6f6ee", fg: "#ffffff" },
  { level: 5, label: "Otimizado", min: 80, max: 101, summary: "Dado governado como ativo: automação, qualidade medida e uso preditivo.", color: "#1f4fd8", soft: "#e8eefd", fg: "#ffffff" },
];

export function bandForScore(pct: number | null | undefined): Band | null {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  return BANDS.find((b) => pct >= b.min && pct < b.max) ?? BANDS[BANDS.length - 1];
}
export function bandForLevel(level: number): Band {
  return BANDS[Math.max(1, Math.min(5, level)) - 1];
}

/** Cor da faixa de maturidade para um score (0–100) — heatmaps, barras e anéis. */
export function toneFor(pct: number | null | undefined): { bg: string; fg: string } {
  if (pct === null || pct === undefined) return { bg: "var(--tone-empty)", fg: "var(--ink-3)" };
  const b = bandForScore(pct)!;
  return { bg: b.color, fg: b.fg };
}

export function colorFor(pct: number | null | undefined): string {
  return pct === null || pct === undefined ? "var(--line-2)" : bandForScore(pct)!.color;
}

// ---------------------------------------------------------------------
// Contexto da empresa (etapa 0 do assessment)
// ---------------------------------------------------------------------
export const SEGMENTS = [
  "Varejo físico",
  "Varejo omnichannel",
  "E-commerce puro",
  "Atacado / Distribuição",
  "Operador logístico / Transportadora",
  "Indústria com canal próprio",
] as const;

export const SIZE_BANDS = ["Até 50 colaboradores", "51 a 200", "201 a 500", "Mais de 500"] as const;

export const SYSTEM_SUGGESTIONS = [
  "SAP", "TOTVS", "Omie", "Bling", "Sankhya", "VTEX", "Shopify", "Mercado Livre", "WMS", "TMS", "Power BI", "Excel / Google Sheets",
];

export interface AssessmentContext {
  segmento?: string;
  porte?: string;
  faturamento?: string;
  lojas_cds?: string;
  skus?: string;
  sistemas?: string[];
  time_dados?: string;
  dores?: string;
  objetivo?: string;
  dominios?: string[];
}
