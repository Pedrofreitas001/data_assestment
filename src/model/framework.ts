// =====================================================================
// FRAMEWORK DE MATURIDADE — Moulis (versão 3, universal)
// Duas lentes complementares:
//  1. CAPACIDADES (8 dimensões, alinhadas a DAMA-DMBOK, DCAM v3, DGI e
//     aos modelos Data Orchard / UK Data Maturity Assessment)
//     → "a empresa TEM a estrutura para gerir dados?"
//  2. ÁREAS DA EMPRESA com checagens de CONSISTÊNCIA, cada uma marcada
//     com uma dimensão de qualidade (DAMA UK)
//     → "o dado da operação BATE com a realidade?"
//     Núcleo universal (toda empresa) + módulos por setor (opcionais).
//
// Regras de escrita (valem para qualquer pergunta nova):
//  - Enunciado curto, sem jargão; jargão vai para `help`.
//  - Sempre 4 níveis, com a mesma lógica:
//      1 inexistente/improvisado · 2 informal, depende de pessoas ·
//      3 definido (documentado, com responsável) · 4 gerenciado (medido,
//      automatizado, revisado)
//  - Cada nível descreve algo observável, não uma opinião.
//  - Uma pergunta = um assunto. Nada de "X e Y" no mesmo enunciado.
//  - Critério de maturidade é o que o negócio precisa, não a ferramenta.
// Editar este arquivo muda o questionário inteiro (form, score, plano, IA).
// =====================================================================

/** Versão do questionário gravada no contexto do diagnóstico (migração de respostas antigas). */
export const FRAMEWORK_VERSION = 3;

export type QualityDim =
  | "acuracidade"
  | "completude"
  | "consistencia"
  | "tempestividade"
  | "unicidade"
  | "validade";

export const QUALITY_DIMS: { key: QualityDim; label: string; question: string }[] = [
  { key: "acuracidade", label: "Acuracidade", question: "O dado reflete a realidade?" },
  { key: "completude", label: "Completude", question: "Está tudo registrado, sem lacunas?" },
  { key: "consistencia", label: "Consistência", question: "O mesmo conceito dá o mesmo número em fontes diferentes?" },
  { key: "tempestividade", label: "Tempestividade", question: "O dado chega a tempo de decidir?" },
  { key: "unicidade", label: "Unicidade", question: "Cada cliente, item ou pedido existe uma única vez?" },
  { key: "validade", label: "Validade", question: "O dado segue a regra de negócio definida?" },
];

// ---------------------------------------------------------------------
// Setores: calibram exemplos, módulos sugeridos e o plano de ação.
// ---------------------------------------------------------------------
export type Sector = "comercio" | "industria" | "servicos" | "logistica" | "saude" | "educacao" | "outro";

export const SEGMENTS = [
  "Varejo / E-commerce",
  "Atacado / Distribuição",
  "Indústria",
  "Serviços B2B / Consultoria",
  "Logística / Transporte",
  "Saúde",
  "Educação",
  "Agronegócio",
  "Tecnologia / Software",
  "Construção / Imobiliário",
  "Outro",
] as const;

/** Traduz o segmento (inclusive os nomes antigos) para a família de setor. */
export function sectorOf(segmento?: string | null): Sector {
  const s = (segmento || "").toLowerCase();
  if (/varejo|e-commerce|ecommerce|omnichannel|atacado|distribui|loja/.test(s)) return "comercio";
  if (/ind[uú]stria|agro|constru/.test(s)) return "industria";
  if (/log[ií]stic|transport|operador/.test(s)) return "logistica";
  if (/sa[uú]de|cl[ií]nica|hospital/.test(s)) return "saude";
  if (/educa|escola|ensino/.test(s)) return "educacao";
  if (/servi|consult|tecnologia|software|imobili/.test(s)) return "servicos";
  return "outro";
}

export const SECTOR_LABEL: Record<Sector, string> = {
  comercio: "comércio",
  industria: "indústria",
  servicos: "serviços",
  logistica: "logística",
  saude: "saúde",
  educacao: "educação",
  outro: "sua empresa",
};

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------
export interface LevelOption {
  v: number;
  label: string;
}

type Examples = Partial<Record<Sector, string>>;

export interface Question {
  id: string;
  prompt: string;
  help?: string;
  /** Exemplo concreto por setor, exibido abaixo do enunciado. */
  examples?: Examples;
  levels: LevelOption[];
  weight?: number;
  /** Rótulo da opção "Não se aplica" quando a pergunta pode não fazer sentido. */
  na?: string;
  /** Pergunta de percepção (subjetiva): pede evidência e cruza com as regras de consistência. */
  perception?: boolean;
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
  examples?: Examples;
  action: string;
  critical?: boolean;
}

export interface OpDomain {
  key: string;
  title: string;
  description: string;
  /** Núcleo universal: vale para qualquer empresa. Os demais são módulos por setor. */
  core: boolean;
  /** Setores para os quais o módulo é sugerido. */
  sectors?: Sector[];
  typicalSources: string[];
  kpis: string[];
  checks: DomainCheck[];
}

/** Valor 0 = "Não sei" — pontua zero e vira ponto cego no relatório. */
export const UNKNOWN = 0;
/** Valor -1 = "Não se aplica" — fica fora do cálculo e não aciona requisitos fundamentais. */
export const NOT_APPLICABLE = -1;

// ---------------------------------------------------------------------
// CAPACIDADES — 8 dimensões, 26 perguntas, todas com 4 níveis
// ---------------------------------------------------------------------
export const DIMENSIONS: Dimension[] = [
  {
    key: "estrategia",
    code: "D1",
    title: "Estratégia & Uso de Dados",
    description: "O quanto a gestão usa dados para decidir, investe nisso e aprende com os resultados.",
    refs: "DCAM · Estratégia e financiamento · Gartner D&A · UK DMA",
    weight: 1,
    questions: [
      {
        id: "est_uso",
        prompt: "Como os dados participam das decisões da gestão hoje?",
        examples: {
          comercio: "Ex.: decidir reposição, preço ou promoção olhando giro e margem.",
          industria: "Ex.: programar produção olhando carteira, capacidade e estoque.",
          servicos: "Ex.: alocar equipe olhando horas vendidas × disponíveis.",
          logistica: "Ex.: redistribuir rotas olhando prazo e custo por entrega.",
          saude: "Ex.: ajustar agenda olhando ocupação e faltas.",
          educacao: "Ex.: agir sobre evasão olhando frequência e inadimplência.",
        },
        levels: [
          { v: 1, label: "Decisões por experiência; dados raramente consultados" },
          { v: 2, label: "Relatórios são puxados quando alguém pede" },
          { v: 3, label: "Indicadores acompanhados em reunião de rotina, com metas" },
          { v: 4, label: "Dados orientam o dia a dia e o planejamento (cenários, previsões)" },
        ],
      },
      {
        id: "est_prioridade",
        prompt: "As iniciativas de dados têm objetivo de negócio, patrocinador e orçamento?",
        help: "Ex.: 'reduzir inadimplência em 15%' depende de um cadastro de clientes confiável — e alguém da diretoria responde por isso.",
        levels: [
          { v: 1, label: "Não — dados são vistos como assunto de TI" },
          { v: 2, label: "Há intenção, mas sem meta, dono ou orçamento" },
          { v: 3, label: "Algumas iniciativas têm meta e patrocinador na diretoria" },
          { v: 4, label: "Plano de dados priorizado pela diretoria, com orçamento e revisão periódica" },
        ],
      },
      {
        id: "est_resultado",
        prompt: "Como a empresa verifica se uma decisão ou iniciativa deu resultado?",
        help: "Ex.: depois de mudar o preço, a política de cobrança ou o processo de atendimento.",
        levels: [
          { v: 1, label: "Não verifica — segue para a próxima" },
          { v: 2, label: "Pela percepção de quem conduziu" },
          { v: 3, label: "Compara o indicador antes e depois nas decisões importantes" },
          { v: 4, label: "Toda iniciativa relevante nasce com meta e é revisada com dados" },
        ],
      },
    ],
  },
  {
    key: "fontes",
    code: "D2",
    title: "Fontes & Infraestrutura",
    description: "Onde o dado mora, se as fontes oficiais são conhecidas, se há acesso estável e se é possível recuperá-lo.",
    refs: "DAMA · Arquitetura, Armazenamento & Operações · DCAM · Arquitetura",
    weight: 1,
    questions: [
      {
        id: "fnt_oficial",
        prompt: "Está claro qual é a fonte oficial de cada informação importante?",
        examples: {
          comercio: "Ex.: vendas, estoque, custo e clientes.",
          industria: "Ex.: pedidos, produção, estoque e custo.",
          servicos: "Ex.: contratos, horas, faturamento e clientes.",
          logistica: "Ex.: entregas, frete, frota e clientes.",
          saude: "Ex.: atendimentos, agenda, faturamento de convênios e pacientes.",
          educacao: "Ex.: matrículas, frequência, mensalidades e alunos.",
        },
        levels: [
          { v: 1, label: "Não — cada área usa sua própria planilha" },
          { v: 2, label: "Poucas pessoas sabem, e há versões concorrentes" },
          { v: 3, label: "Todos sabem qual é a oficial, mas não está escrito" },
          { v: 4, label: "Está documentado em um inventário de fontes, com responsável" },
        ],
      },
      {
        id: "fnt_arquitetura",
        prompt: "Onde ficam os dados usados em relatórios que cruzam mais de uma área?",
        levels: [
          { v: 1, label: "Só nos sistemas de origem e em exportações avulsas" },
          { v: 2, label: "Em planilhas numa pasta compartilhada" },
          { v: 3, label: "Numa base central, atualizada manualmente" },
          { v: 4, label: "Numa base central atualizada automaticamente, com aviso se a carga falhar" },
        ],
      },
      {
        id: "fnt_acesso",
        prompt: "Qual a dificuldade de extrair dados dos sistemas principais?",
        help: "Sistemas principais: ERP, CRM, folha, sistema da operação. Em empresas médias o gargalo costuma ser acesso, não análise.",
        levels: [
          { v: 1, label: "Só por relatório ou exportação manual da tela" },
          { v: 2, label: "Depende do fornecedor do sistema ou de uma pessoa específica" },
          { v: 3, label: "Temos acesso direto (API ou banco) a parte dos sistemas" },
          { v: 4, label: "Acesso direto e documentado a todos os sistemas críticos" },
        ],
      },
      {
        id: "fnt_backup",
        prompt: "Se um sistema crítico ou a base de relatórios falhar, os dados podem ser recuperados?",
        help: "Inclui planilhas-chave que vivem no computador de alguém.",
        levels: [
          { v: 1, label: "Não sabemos se existe cópia de segurança" },
          { v: 2, label: "Existe backup, mas nunca foi testado" },
          { v: 3, label: "Backup automático, com responsável definido" },
          { v: 4, label: "Backup testado periodicamente, com prazo de recuperação combinado" },
        ],
      },
    ],
  },
  {
    key: "qualidade",
    code: "D3",
    title: "Qualidade de Dados",
    description: "Erros detectados cedo e corrigidos na origem — qualidade como rotina, não como incêndio.",
    refs: "DAMA · Data Quality · DCAM · Gestão da qualidade",
    weight: 1.3,
    questions: [
      {
        id: "qual_confianca",
        prompt: "Quanto os gestores confiam nos números antes de decidir?",
        perception: true,
        help: "Pergunta de percepção. Conte na evidência um caso recente em que o número foi (ou não foi) questionado.",
        levels: [
          { v: 1, label: "Não confiam — decidem apesar dos números" },
          { v: 2, label: "Conferem tudo manualmente antes de usar" },
          { v: 3, label: "Confiam nos indicadores principais; erros são ocasionais" },
          { v: 4, label: "Confiam: a qualidade é medida e erros são pegos antes de chegar à gestão" },
        ],
      },
      {
        id: "qual_monitor",
        prompt: "Existe conferência recorrente da qualidade dos dados?",
        help: "Ex.: registros faltando, valores fora do padrão, divergência entre dois sistemas.",
        examples: {
          comercio: "Ex.: dias sem venda por produto, estoque negativo, pedido do site sem nota no ERP.",
          industria: "Ex.: ordem sem apontamento, custo zerado, estrutura de produto incompleta.",
          servicos: "Ex.: horas não apontadas, contrato sem faturamento, cliente sem CNPJ.",
          saude: "Ex.: atendimento sem guia, paciente duplicado, glosa sem motivo.",
          educacao: "Ex.: aluno sem frequência lançada, matrícula duplicada.",
        },
        levels: [
          { v: 1, label: "Não — erros aparecem quando alguém usa o relatório" },
          { v: 2, label: "Conferências manuais, de vez em quando" },
          { v: 3, label: "Conferências definidas, em rotina, com responsável" },
          { v: 4, label: "Alertas automáticos, com dono e prazo de correção" },
        ],
        gate: { belowOrEqual: 1, capLevel: 3, reason: "Sem nenhuma conferência de qualidade, a maturidade não passa de 'Definido'." },
      },
      {
        id: "qual_correcao",
        prompt: "Quando um erro de dado é encontrado, o que acontece?",
        levels: [
          { v: 1, label: "Corrige-se só no relatório; a origem continua errada" },
          { v: 2, label: "Corrige-se na origem quando alguém lembra" },
          { v: 3, label: "É registrado e corrigido na origem por um responsável" },
          { v: 4, label: "A causa é tratada e o erro é prevenido na entrada (validação, trava)" },
        ],
      },
    ],
  },
  {
    key: "integracao",
    code: "D4",
    title: "Integração & Dados Mestres",
    description: "Capacidade de cruzar sistemas por um código comum e manter cadastros únicos de cliente, item e fornecedor.",
    refs: "DAMA · Integração, Dados Mestres & Referência",
    weight: 1.2,
    questions: [
      {
        id: "int_chave",
        prompt: "Clientes, produtos/serviços e fornecedores têm o mesmo código em todos os sistemas (ou uma tabela de correspondência)?",
        help: "É o que permite cruzar, por exemplo, o que foi vendido no CRM com o que foi faturado no ERP.",
        examples: {
          comercio: "Ex.: o mesmo produto tem código diferente no ERP, no site e no marketplace.",
          industria: "Ex.: o item do ERP não bate com o código do apontamento de produção.",
          servicos: "Ex.: o cliente do CRM não é o mesmo cadastro do financeiro.",
          saude: "Ex.: o paciente tem um cadastro na agenda e outro no faturamento.",
          educacao: "Ex.: o aluno tem um código no acadêmico e outro no financeiro.",
        },
        na: "Usamos um único sistema",
        levels: [
          { v: 1, label: "Cada sistema tem seu código, sem correspondência" },
          { v: 2, label: "Correspondência parcial, mantida manualmente por alguém" },
          { v: 3, label: "Correspondência cobre os sistemas principais, com responsável" },
          { v: 4, label: "Cadastro mestre único, com regra de criação e validação" },
        ],
        gate: { belowOrEqual: 2, capLevel: 3, reason: "Sem código comum validado entre sistemas, qualquer cruzamento entre áreas fica sujeito a erro silencioso." },
      },
      {
        id: "int_consol",
        prompt: "Quando é preciso juntar dados de mais de uma fonte, como é feito?",
        levels: [
          { v: 1, label: "Não se junta — cada fonte é usada isoladamente" },
          { v: 2, label: "Copiando e colando entre planilhas" },
          { v: 3, label: "Semiautomático (Power Query, PROCV) ou automático sem regras comuns" },
          { v: 4, label: "Automático, com regras e códigos padronizados" },
        ],
      },
      {
        id: "int_linhagem",
        prompt: "Para os indicadores principais, dá para rastrear de qual sistema vem cada número e que ajustes ele sofreu?",
        help: "No mercado isso se chama linhagem do dado.",
        levels: [
          { v: 1, label: "Não" },
          { v: 2, label: "Só quem montou o relatório sabe" },
          { v: 3, label: "Está documentado para alguns indicadores" },
          { v: 4, label: "Está documentado e atualizado para todos os principais" },
        ],
      },
    ],
  },
  {
    key: "governanca",
    code: "D5",
    title: "Governança & Responsabilidades",
    description: "Quem decide sobre cada dado, com que regra, e como as divergências são resolvidas.",
    refs: "DGI · Direitos de decisão · DAMA · Governança e Metadados",
    weight: 1.2,
    questions: [
      {
        id: "gov_owner",
        prompt: "Os dados mais importantes têm um responsável de negócio que decide as regras e aprova mudanças?",
        help: "No mercado: Data Owner (decide) e Data Steward (executa e confere). Não precisa ser alguém de TI.",
        examples: {
          comercio: "Ex.: o diretor comercial responde pela regra de 'venda líquida'.",
          industria: "Ex.: o gerente industrial responde pela regra de 'produção boa'.",
          servicos: "Ex.: o gerente de operações responde pela regra de 'hora faturável'.",
          saude: "Ex.: a coordenação responde pela regra de 'atendimento realizado'.",
          educacao: "Ex.: a secretaria responde pela regra de 'aluno ativo'.",
        },
        levels: [
          { v: 1, label: "Ninguém é claramente responsável" },
          { v: 2, label: "Todos sabem a quem recorrer, mas não é formal" },
          { v: 3, label: "Responsável formal para parte dos dados críticos" },
          { v: 4, label: "Responsável formal para todos os críticos, com apoio operacional e substituto" },
        ],
        gate: { belowOrEqual: 2, capLevel: 3, reason: "Sem responsável formal, o dado pode estar certo mas sem legitimidade para decisão." },
      },
      {
        id: "gov_glossario",
        prompt: "Os indicadores principais têm definição escrita (fórmula, o que entra e o que sai, responsável)?",
        help: "É o Glossário de KPIs. Evita duas áreas chegarem a números diferentes para o 'mesmo' indicador.",
        levels: [
          { v: 1, label: "Não — cada um calcula do seu jeito" },
          { v: 2, label: "Parcial, desatualizada ou na cabeça de quem montou" },
          { v: 3, label: "Escrita para os principais e validada pelo responsável" },
          { v: 4, label: "Mantida, consultada pelas áreas e usada para resolver divergências" },
        ],
      },
      {
        id: "gov_decisao",
        prompt: "Quando duas áreas divergem sobre um número, como se resolve?",
        levels: [
          { v: 1, label: "Não se resolve, ou prevalece quem tem mais poder" },
          { v: 2, label: "Discussão caso a caso, sem registro" },
          { v: 3, label: "O responsável pelo dado decide com base na definição escrita" },
          { v: 4, label: "Há uma rotina de governança, com as decisões registradas" },
        ],
      },
    ],
  },
  {
    key: "seguranca",
    code: "D6",
    title: "Segurança, Acesso & LGPD",
    description: "Acessos sob controle, proporcionais ao risco, e dados pessoais tratados conforme a LGPD.",
    refs: "NIST · DAMA Segurança · DCAM v3 · Privacidade",
    weight: 1,
    questions: [
      {
        id: "seg_cred",
        prompt: "As senhas e acessos aos sistemas críticos estão sob controle?",
        help: "Quem tem, onde ficam e se são revogados quando alguém sai. Nunca registre senhas aqui.",
        levels: [
          { v: 1, label: "Ninguém sabe ao certo quem tem acesso a quê" },
          { v: 2, label: "Ficam com pessoas específicas, em e-mails ou planilhas" },
          { v: 3, label: "Inventariados, com responsável, em local controlado" },
          { v: 4, label: "Em cofre de senhas, com revisão e revogação no desligamento" },
        ],
      },
      {
        id: "seg_acesso",
        prompt: "O acesso aos dados segue a sensibilidade da informação?",
        levels: [
          { v: 1, label: "Acesso amplo, sem critério" },
          { v: 2, label: "Controle por sistema, sem classificar os dados" },
          { v: 3, label: "Dados classificados (interno, restrito, pessoal) com acesso proporcional" },
          { v: 4, label: "Classificação, revisão periódica de acessos e registro de quem acessou" },
        ],
      },
      {
        id: "seg_lgpd",
        prompt: "Os dados pessoais estão mapeados e tratados conforme a LGPD?",
        examples: {
          comercio: "Ex.: CPF, endereço e telefone de clientes; dados de colaboradores.",
          industria: "Ex.: dados de colaboradores, representantes e clientes pessoa física.",
          servicos: "Ex.: contatos de clientes, dados de colaboradores e terceiros.",
          logistica: "Ex.: destinatários, motoristas e colaboradores.",
          saude: "Ex.: prontuário e dados de saúde — dado pessoal sensível.",
          educacao: "Ex.: dados de alunos (muitos menores de idade) e responsáveis.",
        },
        levels: [
          { v: 1, label: "Não sabemos onde estão os dados pessoais" },
          { v: 2, label: "Sabemos onde estão, mas sem controles específicos" },
          { v: 3, label: "Mapeados, com base legal definida e acesso restrito" },
          { v: 4, label: "Além disso: encarregado (DPO), prazo de retenção e processo para atender titulares" },
        ],
      },
    ],
  },
  {
    key: "pessoas",
    code: "D7",
    title: "Pessoas & Cultura",
    description: "Capacidade do time que produz os números, letramento de quem decide e adoção da rotina de dados.",
    refs: "Data Orchard · Habilidades, Cultura, Liderança · DCAM v3 · Educação",
    weight: 0.9,
    questions: [
      {
        id: "pes_skill",
        prompt: "O time que produz os números consegue atender às perguntas da gestão?",
        help: "Mede a capacidade frente à necessidade — Excel bem feito pode ser suficiente.",
        levels: [
          { v: 1, label: "Não há quem produza análises" },
          { v: 2, label: "Conhecimento básico; depende de TI ou fornecedor" },
          { v: 3, label: "Atende à rotina (Excel avançado, BI)" },
          { v: 4, label: "Atende também a perguntas novas e complexas (SQL, programação, estatística)" },
        ],
      },
      {
        id: "pes_letramento",
        prompt: "Os gestores interpretam os indicadores sem ajuda?",
        help: "Ex.: entender tendência, sazonalidade, meta × realizado e o que fazer quando o número muda.",
        levels: [
          { v: 1, label: "Não — dependem de alguém explicar os números" },
          { v: 2, label: "Poucos gestores, geralmente os da diretoria" },
          { v: 3, label: "A maioria lê os indicadores da própria área" },
          { v: 4, label: "Leem, questionam a qualidade do dado e propõem análises" },
        ],
      },
      {
        id: "pes_dependencia",
        prompt: "Se a pessoa que mais conhece os dados saísse amanhã, o que aconteceria?",
        levels: [
          { v: 1, label: "Problema sério — o conhecimento está só com ela" },
          { v: 2, label: "Levaria semanas para reconstruir" },
          { v: 3, label: "Rotinas críticas documentadas ajudariam a continuar" },
          { v: 4, label: "Conhecimento distribuído, documentado e com substituto treinado" },
        ],
      },
      {
        id: "pes_adocao",
        prompt: "Os painéis e relatórios são usados sem precisar cobrar?",
        perception: true,
        levels: [
          { v: 1, label: "Não — ninguém abre sem cobrança" },
          { v: 2, label: "Poucos usam, geralmente a liderança" },
          { v: 3, label: "Usados nas reuniões de rotina" },
          { v: 4, label: "Parte natural do dia a dia das equipes" },
        ],
      },
    ],
  },
  {
    key: "ia",
    code: "D8",
    title: "Automação & Prontidão para IA",
    description: "Quanto do trabalho com dados já roda sozinho, se o uso de IA tem regras e se a base sustenta os casos desejados.",
    refs: "DCAM v3 · IA/ML · UK DMA · Uso ético",
    weight: 0.8,
    questions: [
      {
        id: "ia_automacao",
        prompt: "Quanto das rotinas de dados (cargas, relatórios, conferências) roda sem intervenção manual?",
        levels: [
          { v: 1, label: "Nada — tudo é feito à mão a cada vez" },
          { v: 2, label: "Poucas rotinas, pontuais" },
          { v: 3, label: "Boa parte das rotinas recorrentes" },
          { v: 4, label: "A maioria das críticas, com aviso quando falham" },
        ],
      },
      {
        id: "ia_politica",
        prompt: "O uso de IA com dados da empresa tem regras?",
        help: "Ex.: se pode colar lista de clientes ou contrato no ChatGPT, quais ferramentas são aprovadas.",
        levels: [
          { v: 1, label: "Não há regra — cada um usa como quer" },
          { v: 2, label: "Orientação informal, sem registro" },
          { v: 3, label: "Política escrita: o que pode, o que não pode e ferramentas aprovadas" },
          { v: 4, label: "Política aplicada, com casos de uso aprovados e acompanhados" },
        ],
      },
      {
        id: "ia_dados",
        prompt: "Para os usos de IA que a empresa deseja, os dados necessários existem e são confiáveis?",
        help: "Ex.: previsão de demanda, triagem de atendimento, leitura automática de documentos.",
        levels: [
          { v: 1, label: "Ainda não há casos de uso definidos" },
          { v: 2, label: "Há casos definidos, mas os dados faltam ou são ruins" },
          { v: 3, label: "Os dados estão prontos para parte dos casos" },
          { v: 4, label: "Dados disponíveis e governados para os casos priorizados" },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------
// ÁREAS DA EMPRESA — checagens de consistência
// Resposta: 0 Não sei · -1 Não se aplica · 1 Não · 2 Parcial · 3 Sim, com rotina
// Cada checagem pergunta se EXISTE um controle (verificável), não se o
// dado "está perfeito".
// ---------------------------------------------------------------------
export const CHECK_OPTIONS: LevelOption[] = [
  { v: 1, label: "Não" },
  { v: 2, label: "Parcial / às vezes" },
  { v: 3, label: "Sim, com rotina e responsável" },
];

export const DOMAINS: OpDomain[] = [
  // ------------------------------------------------ núcleo universal
  {
    key: "comercial",
    core: true,
    title: "Comercial & Clientes",
    description: "Vendas, receita, propostas, preços e carteira de clientes.",
    typicalSources: ["ERP / faturamento", "CRM", "Planilha de metas"],
    kpis: ["faturamento_liquido", "ticket_medio", "margem_bruta", "taxa_conversao_propostas"],
    checks: [
      { id: "com_fat_bate", quality: "consistencia", critical: true, prompt: "A receita do sistema de faturamento bate com a do relatório gerencial no fechamento do mês?", action: "Conciliar todo mês a receita do faturamento com a do relatório gerencial, com tolerância definida e causa registrada para cada diferença." },
      { id: "com_devolucao", quality: "validade", prompt: "Cancelamentos, devoluções e descontos seguem a mesma regra em todos os relatórios de receita?", action: "Escrever a regra de 'receita líquida' (o que deduz e em que data) e aplicá-la em todos os relatórios." },
      { id: "com_funil", quality: "completude", prompt: "Propostas e oportunidades ficam registradas num só lugar, com status e valor?", examples: { comercio: "Ex.: pedidos de clientes B2B, orçamentos.", servicos: "Ex.: propostas enviadas, contratos em negociação.", industria: "Ex.: cotações e pedidos em carteira." }, action: "Centralizar propostas num único registro (CRM ou planilha única) com status, valor e data." },
      { id: "com_preco", quality: "acuracidade", prompt: "Preços e condições comerciais praticados ficam registrados com histórico?", action: "Guardar histórico de preços e condições com data de vigência, em vez de sobrescrever a tabela." },
      { id: "com_cliente_dup", quality: "unicidade", prompt: "Há verificação de duplicidade no cadastro de clientes (mesmo CPF/CNPJ com códigos diferentes)?", action: "Rodar deduplicação por CPF/CNPJ e bloquear a criação de cliente sem documento validado." },
    ],
  },
  {
    key: "financeiro",
    core: true,
    title: "Financeiro & Controladoria",
    description: "DRE gerencial, custos, margens, orçamento e fechamento.",
    typicalSources: ["ERP contábil/financeiro", "Planilhas de orçamento", "Bancos"],
    kpis: ["margem_bruta", "prazo_fechamento", "inadimplencia"],
    checks: [
      { id: "fin_dre", quality: "consistencia", critical: true, prompt: "A DRE gerencial bate com a contabilidade (mesma receita, mesmo custo)?", action: "Montar a ponte mensal DRE gerencial × contábil com as diferenças explicadas." },
      { id: "fin_rateio", quality: "validade", prompt: "Os critérios de rateio de despesas comuns estão escritos e são estáveis?", action: "Escrever os critérios de rateio e registrar qualquer mudança para não quebrar o histórico." },
      { id: "fin_fechamento", quality: "tempestividade", prompt: "O fechamento gerencial tem prazo definido e é cumprido?", action: "Definir o prazo do fechamento, mapear o caminho crítico e automatizar as extrações mais demoradas." },
      { id: "fin_orcado", quality: "completude", prompt: "Orçado × realizado está disponível no mesmo nível de detalhe (unidade, área, categoria)?", action: "Alinhar o nível de detalhe do orçamento ao do realizado já na elaboração." },
    ],
  },
  {
    key: "pessoas",
    core: true,
    title: "Pessoas & RH",
    description: "Quadro de colaboradores, folha, ponto, turnover e dados pessoais sensíveis.",
    typicalSources: ["Sistema de folha", "Ponto eletrônico", "Planilhas de RH", "Benefícios"],
    kpis: ["turnover", "absenteismo", "headcount"],
    checks: [
      { id: "rh_headcount", quality: "consistencia", critical: true, prompt: "O número de colaboradores bate entre folha, ponto e relatório gerencial?", action: "Conciliar todo mês o quadro de colaboradores entre folha, ponto e relatório gerencial." },
      { id: "rh_indicadores", quality: "validade", prompt: "Turnover e absenteísmo têm regra de cálculo escrita?", action: "Escrever a regra de turnover e absenteísmo (quem conta, qual período) no Glossário de KPIs." },
      { id: "rh_matricula", quality: "unicidade", prompt: "Cada colaborador tem uma única matrícula em todos os sistemas de RH?", action: "Padronizar a matrícula como código único em folha, ponto e benefícios." },
      { id: "rh_ponto", quality: "completude", prompt: "Horas, faltas e afastamentos são registrados no sistema de forma completa (sem controles paralelos em papel)?", action: "Eliminar controles paralelos de ponto e afastamentos, centralizando no sistema oficial." },
    ],
  },
  {
    key: "operacoes",
    core: true,
    title: "Operações & Entrega",
    description: "Como o produto ou serviço chega ao cliente: prazos, execução, ocorrências e retrabalho.",
    typicalSources: ["Sistema da operação", "ERP", "Planilhas de controle", "Sistema de atendimento"],
    kpis: ["cumprimento_prazo", "taxa_retrabalho", "tempo_atendimento"],
    checks: [
      { id: "op_prazo", quality: "validade", critical: true, prompt: "O cumprimento de prazo com o cliente (prometido × realizado) é medido com regra definida?", examples: { comercio: "Ex.: prazo de entrega do pedido.", industria: "Ex.: data de entrega do pedido em carteira.", servicos: "Ex.: SLA de atendimento ou marco do projeto.", logistica: "Ex.: OTIF por transportadora.", saude: "Ex.: tempo de espera por consulta/exame.", educacao: "Ex.: prazo de emissão de documentos e respostas." }, action: "Escrever a regra de cumprimento de prazo (qual data vale, tolerância) e medir para todos os clientes." },
      { id: "op_registro", quality: "completude", prompt: "Toda entrega, atendimento ou ordem é registrada do início ao fim — não só as que dão problema?", action: "Registrar início e fim de toda entrega/atendimento no sistema da operação." },
      { id: "op_status", quality: "tempestividade", prompt: "O andamento do que está em execução é visível a tempo de agir sobre atrasos?", action: "Criar uma visão diária do que está em andamento, com alerta de atraso por responsável." },
      { id: "op_ocorrencias", quality: "acuracidade", prompt: "Retrabalhos, falhas e reclamações são registrados com a causa?", action: "Registrar ocorrências com causa padronizada (lista fechada) para tratar as mais frequentes." },
    ],
  },
  {
    key: "compras",
    core: true,
    title: "Compras & Fornecedores",
    description: "Pedidos de compra, fornecedores, prazos e custo de aquisição.",
    typicalSources: ["ERP (compras)", "Portal de fornecedores", "Planilha de follow-up"],
    kpis: ["lead_time_fornecedor", "fill_rate_fornecedor"],
    checks: [
      { id: "cmp_custo", quality: "acuracidade", critical: true, prompt: "O custo usado no cálculo de margem é o custo real atualizado, com regra definida?", help: "Inclui frete e impostos quando fizer sentido.", action: "Definir com o financeiro a regra de custo (médio, reposição ou com frete e impostos) e a frequência de atualização." },
      { id: "cmp_recebimento", quality: "consistencia", prompt: "Pedido de compra, nota fiscal e recebimento (produto ou serviço) são confrontados antes de pagar?", action: "Conferir pedido × nota × recebimento antes do pagamento, registrando divergências por fornecedor." },
      { id: "cmp_leadtime", quality: "completude", prompt: "O prazo real de cada fornecedor (pedido → recebimento) é registrado?", action: "Registrar data do pedido e do recebimento para medir o prazo real × prometido de cada fornecedor." },
      { id: "cmp_fornecedor_dup", quality: "unicidade", prompt: "Cada fornecedor tem um único cadastro, padronizado?", action: "Deduplicar fornecedores por CNPJ e padronizar razão social e condições no cadastro." },
    ],
  },
  {
    key: "cadastro",
    core: true,
    title: "Cadastros & Dados Mestres",
    description: "Produtos ou serviços, clientes, fornecedores, categorias e centros de custo.",
    typicalSources: ["ERP (cadastros)", "Planilha de cadastro", "Tabela de correspondência de códigos"],
    kpis: ["completude_cadastro"],
    checks: [
      { id: "cad_regra", quality: "validade", critical: true, prompt: "Existe regra e responsável para criar ou alterar cadastros?", help: "Campos obrigatórios, quem aprova, o que valida antes de salvar.", action: "Criar o fluxo de cadastro: campos obrigatórios, quem aprova e o que é validado antes de salvar." },
      { id: "cad_hierarquia", quality: "consistencia", prompt: "As classificações (categorias, linhas de serviço, centros de custo) são as mesmas em todos os sistemas e relatórios?", action: "Definir a classificação oficial numa tabela única e usá-la em todos os relatórios." },
      { id: "cad_completo", quality: "completude", prompt: "Os cadastros ativos têm os campos obrigatórios preenchidos?", examples: { comercio: "Ex.: NCM, EAN, peso, custo, categoria.", servicos: "Ex.: CNPJ, contrato, centro de custo.", industria: "Ex.: NCM, estrutura de produto, custo padrão.", saude: "Ex.: convênio, carteirinha, CPF.", educacao: "Ex.: responsável financeiro, turma, CPF." }, action: "Medir o % de preenchimento dos campos obrigatórios e corrigir primeiro os cadastros mais usados." },
      { id: "cad_sync", quality: "tempestividade", prompt: "Uma alteração de cadastro chega a todos os sistemas no mesmo dia?", action: "Definir o sistema de origem de cada cadastro e sincronizar os demais a partir dele." },
    ],
  },

  // ------------------------------------------------ módulos por setor
  {
    key: "estoque",
    core: false,
    sectors: ["comercio", "industria", "logistica"],
    title: "Estoque & Inventário",
    description: "Saldo, posição por local, ruptura, cobertura e unidades de medida.",
    typicalSources: ["ERP (saldo contábil)", "WMS / controle físico", "Inventários cíclicos"],
    kpis: ["acuracidade_inventario", "ruptura", "cobertura_estoque", "giro_estoque", "aging_estoque"],
    checks: [
      { id: "est_acuracidade", quality: "acuracidade", critical: true, prompt: "A acuracidade do estoque (físico × sistema) é medida por contagem periódica?", action: "Fazer contagem cíclica por curva ABC (A mensal, B trimestral, C semestral) e publicar a acuracidade como indicador." },
      { id: "est_erp_wms", quality: "consistencia", critical: true, prompt: "O saldo do sistema de gestão e o do controle físico/WMS são conciliados em rotina?", action: "Conciliar diariamente os saldos por item e local, com lista de divergências e responsável pela correção." },
      { id: "est_negativo", quality: "validade", prompt: "O sistema impede ou sinaliza estoque negativo?", action: "Bloquear saída sem saldo ou gerar alerta diário de itens negativos." },
      { id: "est_ruptura", quality: "completude", prompt: "Faltas de estoque são registradas por item e dia, não só percebidas?", action: "Guardar a posição diária de estoque por item para medir dias de ruptura e venda perdida." },
      { id: "est_atualizacao", quality: "tempestividade", prompt: "A posição de estoque usada para decidir tem atualização com prazo definido?", action: "Agendar a carga automática de saldos e mostrar a data de atualização em todo painel." },
      { id: "cad_unidade", quality: "acuracidade", prompt: "Unidades de medida e fatores de conversão (caixa × unidade) estão corretos?", action: "Auditar os fatores de conversão dos itens com maior divergência de estoque." },
    ],
  },
  {
    key: "logistica",
    core: false,
    sectors: ["logistica"],
    title: "Logística & Transporte",
    description: "Expedição, frete, prazo de entrega e OTIF.",
    typicalSources: ["WMS", "TMS", "CT-e / faturas de frete", "Rastreio de transportadoras"],
    kpis: ["otif", "lead_time_entrega", "custo_frete_receita", "produtividade_separacao"],
    checks: [
      { id: "log_otif_regra", quality: "validade", critical: true, prompt: "O OTIF é calculado com regra definida (data prometida × entrega real, quantidade completa)?", action: "Escrever a regra de OTIF (qual data prometida, tolerância, entregas parciais) e aplicá-la a todas as transportadoras." },
      { id: "log_frete_conc", quality: "consistencia", prompt: "O frete contratado é conferido com o CT-e e a fatura da transportadora?", action: "Auditar o frete: tabela contratada × CT-e × fatura, com relatório de cobranças indevidas." },
      { id: "log_entrega_real", quality: "completude", prompt: "A data de entrega real é capturada para todos os pedidos?", action: "Integrar o rastreio das transportadoras ou exigir comprovante digital de entrega." },
      { id: "log_status", quality: "tempestividade", prompt: "O status dos pedidos em trânsito é visível a tempo de agir sobre atrasos?", action: "Painel diário de pedidos em trânsito com alerta de atraso por transportadora." },
      { id: "log_cadastro", quality: "acuracidade", prompt: "Peso e dimensões dos itens estão corretos no cadastro?", action: "Recadastrar peso e dimensões começando pelos itens mais movimentados." },
    ],
  },
  {
    key: "ecommerce",
    core: false,
    sectors: ["comercio"],
    title: "E-commerce & Canais Digitais",
    description: "Loja online, marketplaces, campanhas e mídia.",
    typicalSources: ["Plataforma de e-commerce", "Marketplaces", "Google Ads / Meta", "Atendimento"],
    kpis: ["conversao", "roi_campanha", "taxa_devolucao"],
    checks: [
      { id: "ecm_pedidos_erp", quality: "consistencia", critical: true, prompt: "Os pedidos dos canais digitais batem com os pedidos faturados no ERP?", action: "Conciliar diariamente os pedidos plataforma × ERP pelo número do pedido, com fila de não integrados." },
      { id: "ecm_sku_map", quality: "unicidade", prompt: "Os produtos da loja e dos marketplaces têm correspondência 1:1 com o código do ERP (inclusive kits)?", action: "Incluir loja e marketplaces na tabela de correspondência de códigos; tratar kits como composição." },
      { id: "ecm_roi", quality: "completude", prompt: "Custo de mídia, custo do produto e receita podem ser cruzados por campanha?", action: "Padronizar os identificadores de campanha (UTMs) e trazer o custo do produto para a mesma chave." },
      { id: "ecm_estoque_sync", quality: "tempestividade", prompt: "O estoque publicado nos canais é sincronizado com o disponível real?", action: "Sincronizar estoque automaticamente, com reserva de segurança por canal." },
    ],
  },
  {
    key: "producao",
    core: false,
    sectors: ["industria"],
    title: "Produção & Qualidade",
    description: "Ordens de produção, apontamentos, estrutura de produto, eficiência e não conformidades.",
    typicalSources: ["ERP / MRP", "Apontamento de produção", "Planilhas de qualidade", "MES"],
    kpis: ["oee", "indice_refugo"],
    checks: [
      { id: "prd_apontamento", quality: "completude", critical: true, prompt: "A produção é apontada por ordem (quantidade boa, refugo, tempo) no sistema?", action: "Apontar toda ordem de produção no sistema, com quantidade boa, refugo e tempo." },
      { id: "prd_estrutura", quality: "acuracidade", critical: true, prompt: "As estruturas de produto (lista de materiais) e roteiros estão corretos no sistema?", help: "Base para custo, compras e planejamento.", action: "Revisar estruturas e roteiros começando pelos produtos de maior volume, comparando consumo real × teórico." },
      { id: "prd_eficiencia", quality: "validade", prompt: "A eficiência (ex.: OEE) é calculada com regra definida para paradas e tempo padrão?", action: "Escrever a regra de eficiência (paradas planejadas, tempo padrão) e aplicá-la a todas as linhas." },
      { id: "prd_nc", quality: "consistencia", prompt: "As não conformidades registradas batem com o refugo e o retrabalho apontados?", action: "Conciliar mensalmente não conformidades × refugo apontado, com causa registrada." },
    ],
  },
  {
    key: "projetos",
    core: false,
    sectors: ["servicos"],
    title: "Projetos, Contratos & Horas",
    description: "Contratos, horas trabalhadas, rentabilidade e andamento de projetos ou atendimentos.",
    typicalSources: ["Sistema de apontamento de horas", "Gestão de projetos", "ERP / faturamento", "Planilhas de contratos"],
    kpis: ["taxa_utilizacao", "margem_contrato"],
    checks: [
      { id: "prj_horas", quality: "completude", critical: true, prompt: "As horas trabalhadas são apontadas por cliente/projeto de forma completa?", action: "Tornar obrigatório o apontamento semanal de horas por cliente/projeto, com conferência do gestor." },
      { id: "prj_faturamento", quality: "consistencia", prompt: "O faturado por contrato bate com o que foi entregue ou medido?", action: "Conciliar todo mês o faturado × entregue por contrato, listando o que ficou sem faturar." },
      { id: "prj_rentab", quality: "acuracidade", prompt: "A rentabilidade por contrato considera o custo real das horas e despesas?", action: "Calcular a margem por contrato com custo/hora real e despesas diretas." },
      { id: "prj_status", quality: "tempestividade", prompt: "Prazo, escopo e orçamento dos projetos são atualizados a tempo de agir?", action: "Revisão semanal curta do status dos projetos, com sinal de alerta por prazo e orçamento." },
    ],
  },
];

/** Áreas sugeridas quando o usuário não escolheu: núcleo + módulos do setor. */
export function suggestedDomainKeys(segmento?: string | null): string[] {
  const sec = sectorOf(segmento);
  return DOMAINS.filter((d) => d.core || d.sectors?.includes(sec)).map((d) => d.key);
}

/** Exemplo do setor (ou nada). */
export function exampleFor(examples: Examples | undefined, segmento?: string | null): string | undefined {
  if (!examples) return undefined;
  return examples[sectorOf(segmento)];
}

export const ALL_QUESTIONS = DIMENSIONS.flatMap((d) => d.questions.map((q) => ({ ...q, dim: d })));
export const ALL_CHECKS = DOMAINS.flatMap((d) => d.checks.map((c) => ({ ...c, domain: d })));

export function findQuestion(id: string) {
  return ALL_QUESTIONS.find((q) => q.id === id);
}
export function findCheck(id: string) {
  return ALL_CHECKS.find((c) => c.id === id);
}

/** Texto de uma resposta (inclui Não sei / Não se aplica). */
export function answerLabel(levels: LevelOption[], v: number | undefined, naLabel = "Não se aplica"): string | null {
  if (v === undefined) return null;
  if (v === UNKNOWN) return "Não sei";
  if (v === NOT_APPLICABLE) return naLabel;
  return levels.find((l) => l.v === v)?.label ?? String(v);
}

// ---------------------------------------------------------------------
// Faixas de maturidade (1–5)
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
  { level: 3, label: "Definido", min: 40, max: 60, summary: "Fontes e indicadores conhecidos, com rotina; ainda frágil em integração e qualidade.", color: "#f5a524", soft: "#fff6e0", fg: "#3d2800" },
  { level: 4, label: "Gerenciado", min: 60, max: 80, summary: "Dados consolidados, com responsáveis, conferência de qualidade e uso recorrente.", color: "#2fa36b", soft: "#e6f6ee", fg: "#ffffff" },
  { level: 5, label: "Otimizado", min: 80, max: 101, summary: "Dado gerido como ativo: automação, qualidade medida e uso preditivo.", color: "#1f4fd8", soft: "#e8eefd", fg: "#ffffff" },
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
// Contexto da empresa (etapa 0) — calibra exemplos, áreas e o plano.
// ---------------------------------------------------------------------
export const SIZE_BANDS = ["Até 50 colaboradores", "51 a 200", "201 a 500", "Mais de 500"] as const;

export const SYSTEM_SUGGESTIONS = [
  "TOTVS", "SAP", "Sankhya", "Omie", "Bling", "Senior", "Salesforce", "HubSpot", "RD Station", "Pipedrive",
  "VTEX", "Shopify", "Power BI", "Excel / Google Sheets",
];

/** Quem cuida de dados hoje — define o tamanho realista do plano. */
export const TEAM_OPTIONS = [
  { key: "ninguem", label: "Ninguém dedicado", hint: "Os números saem de quem tem tempo" },
  { key: "acumula", label: "Alguém de outra área acumula", hint: "Ex.: analista financeiro que também faz os relatórios" },
  { key: "um", label: "1 pessoa dedicada a dados/BI" },
  { key: "time", label: "Time de 2 ou mais pessoas" },
  { key: "externo", label: "Fornecedor ou consultoria externa" },
] as const;

export type TeamKey = (typeof TEAM_OPTIONS)[number]["key"];

/** Objetivo principal com dados nos próximos 6 meses — prioriza o plano. */
export const GOALS = [
  { key: "confianca", label: "Confiar nos números", hint: "Parar de discutir qual número está certo" },
  { key: "manual", label: "Reduzir trabalho manual", hint: "Relatórios que levam dias para sair" },
  { key: "visao", label: "Ter visão integrada do negócio", hint: "Cruzar áreas num só lugar" },
  { key: "risco", label: "Reduzir riscos (LGPD, acessos, dependência de pessoas)", hint: "" },
  { key: "crescer", label: "Preparar para crescer ou usar IA", hint: "" },
] as const;

export type GoalKey = (typeof GOALS)[number]["key"];

export interface AssessmentContext {
  segmento?: string;
  porte?: string;
  faturamento?: string;
  /** Unidades, lojas, filiais ou locais de operação. */
  unidades?: string;
  sistemas?: string[];
  /** Quem cuida de dados hoje (TEAM_OPTIONS). */
  time_dados?: string;
  dores?: string;
  /** Objetivo principal (GOALS). */
  objetivo?: string;
  dominios?: string[];
  /** Versão do questionário em que as respostas estão. */
  versao?: number;
  /** Campos antigos (v2), mantidos para leitura. */
  lojas_cds?: string;
  skus?: string;
}
