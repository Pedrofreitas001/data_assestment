// Roteiros do tour guiado, por tela. Cada passo aponta para um elemento (seletor CSS);
// passos cujo elemento não está visível na hora são pulados.
export interface TourStep {
  sel: string;
  /** Alternativa no celular (ex.: menu recolhido). */
  alt?: string;
  title: string;
  text: string;
}

const MENU: TourStep[] = [
  {
    sel: ".sidebar .nav",
    alt: ".mobile-bar",
    title: "Menu principal",
    text: "Daqui você vai para cada parte do app: Início, Diagnósticos, Priorização e Glossário de KPIs. A equipe Moulis também vê Steward e Clientes.",
  },
  { sel: ".org-switch", title: "Empresa ativa", text: "Tudo o que aparece no app é da empresa escolhida aqui. A equipe Moulis troca de cliente por este seletor." },
];

const END: TourStep = {
  sel: ".fab",
  title: "Assistente",
  text: "Ficou com dúvida em qualquer tela? Abra o assistente: ele explica conceitos, interpreta o resultado e redige textos. O tour guiado também fica lá.",
};

const PAGES: { match: (path: string) => boolean; steps: TourStep[] }[] = [
  {
    match: (p) => p === "/",
    steps: [
      { sel: '[data-tour="home-start"]', title: "Comece pelo diagnóstico", text: "São cerca de 40 minutos de perguntas objetivas. Ao final, a empresa recebe o nível de maturidade e um plano priorizado." },
      { sel: ".hero-home", title: "Onde a empresa está", text: "O nível de maturidade (de 1 a 5), a nota e o que impede o próximo nível, segundo o diagnóstico mais recente." },
      { sel: '[data-tour="home-passos"]', title: "Próximos passos", text: "Os 3 passos que mais fazem diferença agora. Clique em um para ver onde vocês estão, por que importa e como fazer." },
      { sel: "#prioridades", title: "Prioridades", text: "O que a empresa decidiu focar. Qualquer passo do plano ou resposta do assistente pode virar uma prioridade, com status." },
      { sel: '[data-tour="home-ask"]', title: "Pergunte ao assistente", text: "Dúvidas sobre o resultado, conceitos ou um texto pronto para a diretoria — em linguagem simples." },
      { sel: '[data-tour="home-cap"]', title: "Nota por capacidade", text: "As 8 capacidades avaliadas, da estratégia à IA. As mais baixas costumam explicar o nível." },
    ],
  },
  {
    match: (p) => /^\/assessments\/[^/]+\/resultado$/.test(p),
    steps: [
      { sel: ".hero-home", title: "Nível atribuído", text: "O nível de maturidade e o que o limita. Alguns fundamentos, como ter um responsável pelos dados, seguram o nível mesmo com média alta." },
      { sel: '[data-tour="res-leitura"]', title: "Leitura executiva", text: "O assistente escreve um resumo para a diretoria a partir das respostas. Você pode gerar de novo quando quiser." },
      { sel: '[data-tour="res-cap"]', title: "Capacidades", text: "Onde a empresa está forte e onde está fraca, nas 8 capacidades." },
      { sel: '[data-tour="res-qual"]', title: "Qualidade dos dados por área", text: "Em cada área (comercial, financeiro, estoque…), quais controles já existem e quais faltam." },
      { sel: "#plano", title: "Próximos passos", text: "O plano em 3 ondas: onde vocês estão, por que importa, aonde chegar, como fazer, responsável e prazo." },
      { sel: ".head-actions", title: "Editar e exportar", text: "Volte às respostas quando algo mudar, ou exporte o relatório em PDF para levar à reunião." },
    ],
  },
  {
    match: (p) => /^\/assessments\/[^/]+$/.test(p),
    steps: [
      { sel: ".stepper", alt: ".step-select", title: "Seções do diagnóstico", text: "Contexto, as 8 capacidades, as áreas da empresa e a revisão final. Dá para ir e voltar à vontade — tudo é salvo sozinho." },
      { sel: '[data-tour="wiz-main"]', title: "Perguntas", text: "Escolha a opção que descreve a empresa hoje, não a ideal. “Não sei” também é resposta: vira um ponto a investigar." },
      { sel: ".q-foot", title: "Ajuda em cada pergunta", text: "“Explicar” chama o assistente; “Evidência” registra a prova (um relatório, quem faz e com que frequência)." },
      { sel: '[data-tour="wiz-conversa"]', title: "Responder conversando", text: "Prefere conversar? O assistente faz as perguntas em linguagem simples e marca as opções para você revisar." },
      { sel: ".wizard-rail", title: "Resultado parcial", text: "A nota vai se formando enquanto você responde." },
      { sel: ".wizard-nav", title: "Avançar", text: "Siga para a próxima seção quando terminar esta." },
    ],
  },
  {
    match: (p) => p === "/assessments",
    steps: [
      { sel: ".head-actions", title: "Novo diagnóstico", text: "Cria um diagnóstico para a empresa ativa. Leva cerca de 40 minutos e pode ser feito em mais de uma sessão." },
      { sel: ".table", title: "Diagnósticos da empresa", text: "Status, nível e progresso de cada diagnóstico. Clique para continuar respondendo ou ver o relatório." },
    ],
  },
  {
    match: (p) => p === "/priorizacao",
    steps: [
      { sel: '[data-tour="pz-reco"]', title: "Por onde começar", text: "A área recomendada, o ganho estimado por ano e o esforço para estruturá-la." },
      { sel: '[data-tour="pz-matriz"]', title: "Esforço × ganho", text: "Cada bolha é uma área: quanto mais alto, mais ganho; quanto mais à esquerda, menos esforço. Passe o mouse para ver os detalhes." },
      { sel: ".eg-none", title: "Áreas sem estimativa", text: "Clique para estimar o ganho escolhendo faixas — não precisa de número exato." },
      { sel: '[data-tour="pz-ordem"]', title: "Ordem de ataque: a decisão é sua", text: "O app sugere uma ordem, mas o responsável pode mudá-la por qualquer motivo, mesmo sem dados preenchidos. Arraste pela alça ⠿ ou use as setas; “Voltar à sugestão” desfaz." },
      { sel: ".pz-row .pz-row-title", title: "Detalhes da área", text: "Clique no nome da área para ver de onde vem o ganho e editar os valores." },
      { sel: ".head-actions", title: "Resumo para a diretoria", text: "O assistente redige um texto pronto com a área a atacar primeiro, o porquê e o ganho estimado." },
    ],
  },
  {
    match: (p) => p === "/glossario",
    steps: [
      { sel: ".head-actions", title: "Criar KPIs", text: "Importe definições prontas da Biblioteca Moulis, redija com IA ou crie do zero." },
      { sel: ".metrics", title: "Situação do glossário", text: "Quantos KPIs estão documentados, validados pelo responsável e sem dono." },
      { sel: ".toolbar", title: "Busca e filtros", text: "Encontre um KPI por nome, fórmula, área ou status." },
      { sel: ".kpi-card", title: "Ficha do KPI", text: "Clique para ver e editar definição, fórmula, responsável e de onde vem cada número." },
    ],
  },
  {
    match: (p) => p === "/steward",
    steps: [
      { sel: ".head-actions", title: "Avaliar uma pessoa", text: "Uma conversa de 15 a 20 minutos e 11 perguntas em etapas: negócio, dados, trânsito entre áreas e tempo." },
      { sel: ".sw-private", title: "Só para a equipe Moulis", text: "O cliente não vê estas avaliações. É prontidão para o papel, não avaliação de desempenho." },
      { sel: ".sw-grid", title: "Candidatos", text: "Nota, perfil, radar e como apoiar cada pessoa. Marque quem será o steward do diagnóstico." },
      { sel: ".sw-req", title: "O que o papel exige", text: "O steward conduz as conversas com cada área, junta as evidências e cobra o plano." },
    ],
  },
  {
    match: (p) => p.startsWith("/admin"),
    steps: [
      { sel: ".tabs", title: "Carteira, comparativo e usuários", text: "Acompanhe os clientes, compare a maturidade entre eles e gerencie quem tem acesso." },
      { sel: ".head-actions", title: "Nova empresa e convites", text: "Cadastre uma empresa e convide as pessoas dela para responder o diagnóstico." },
      { sel: ".table", title: "Clientes", text: "Situação de cada cliente: nível, progresso e última atualização." },
    ],
  },
  {
    match: (p) => p === "/framework",
    steps: [{ sel: ".page-head", title: "Metodologia", text: "Como a maturidade é medida: os 5 níveis, o cálculo, as capacidades e os conceitos essenciais." }],
  },
];

export function stepsFor(path: string): TourStep[] {
  const page = PAGES.find((p) => p.match(path));
  return [...MENU, ...(page?.steps ?? []), END];
}
