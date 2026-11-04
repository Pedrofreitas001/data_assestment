// =====================================================================
// STEWARD DO DIAGNÓSTICO — a pessoa da empresa consegue conduzir o
// assessment junto com as áreas?
//
// Não mede se a pessoa é especialista em dados. Mede se tem o suficiente de
// negócio, de familiaridade com dados, de trânsito entre as áreas e de
// tempo para ser a ponte entre a empresa e o diagnóstico.
// =====================================================================

export interface StewardOption {
  v: number;
  label: string;
}

export interface StewardQuestion {
  id: string;
  prompt: string;
  /** Como checar na conversa — uma pergunta ou pedido concreto. */
  probe: string;
  options: StewardOption[];
}

export interface StewardDimension {
  key: "negocio" | "dados" | "transito" | "tempo";
  title: string;
  short: string;
  questions: StewardQuestion[];
}

export const STEWARD_DIMENSIONS: StewardDimension[] = [
  {
    key: "negocio",
    title: "Conhece o negócio",
    short: "Negócio",
    questions: [
      {
        id: "neg_fluxo",
        prompt: "Entende como a empresa ganha dinheiro e como as áreas se conectam?",
        probe: "Peça: “Me conte o caminho de um pedido, da venda até o dinheiro entrar.”",
        options: [
          { v: 1, label: "Conhece só a própria rotina" },
          { v: 2, label: "Conhece a própria área e um pouco das vizinhas" },
          { v: 3, label: "Explica o fluxo principal de ponta a ponta" },
          { v: 4, label: "Explica o fluxo e onde ele costuma dar problema" },
        ],
      },
      {
        id: "neg_indicadores",
        prompt: "Conhece os principais indicadores que a gestão acompanha?",
        probe: "Pergunte: “Quais números a diretoria olha todo mês? O que cada um quer dizer?”",
        options: [
          { v: 1, label: "Não sabe quais são" },
          { v: 2, label: "Sabe o nome de alguns" },
          { v: 3, label: "Sabe quais são e para que servem" },
          { v: 4, label: "Sabe quais são, como são usados e onde são contestados" },
        ],
      },
    ],
  },
  {
    key: "dados",
    title: "Tem familiaridade com dados",
    short: "Dados",
    questions: [
      {
        id: "dad_origem",
        prompt: "Sabe de onde vêm os números dos relatórios?",
        probe: "Pergunte: “Esse número do faturamento sai de qual sistema ou planilha?”",
        options: [
          { v: 1, label: "Não sabe" },
          { v: 2, label: "Sabe o sistema, não o caminho" },
          { v: 3, label: "Sabe o sistema e quem monta o relatório" },
          { v: 4, label: "Sabe o caminho e os ajustes feitos no meio" },
        ],
      },
      {
        id: "dad_excel",
        prompt: "Consegue extrair e organizar dados por conta própria?",
        probe: "Peça para mostrar uma planilha que a própria pessoa monta.",
        options: [
          { v: 1, label: "Depende de outra pessoa" },
          { v: 2, label: "Exporta e filtra" },
          { v: 3, label: "Cruza fontes (PROCV, tabela dinâmica)" },
          { v: 4, label: "Automatiza (Power Query, BI ou consultas)" },
        ],
      },
      {
        id: "dad_criterio",
        prompt: "Percebe quando um número está estranho e vai atrás da causa?",
        probe: "Pergunte: “Lembra de um número que estava errado? Como você descobriu?”",
        options: [
          { v: 1, label: "Não costuma perceber" },
          { v: 2, label: "Percebe, mas repassa" },
          { v: 3, label: "Percebe e investiga com ajuda" },
          { v: 4, label: "Investiga e chega à causa por conta própria" },
        ],
      },
    ],
  },
  {
    key: "transito",
    title: "Tem trânsito entre as áreas",
    short: "Trânsito",
    questions: [
      {
        id: "tra_acesso",
        prompt: "A pessoa é ouvida pelos gestores das áreas e pela diretoria?",
        probe: "Pergunte a um gestor de outra área se ele reconhece a pessoa como referência.",
        options: [
          { v: 1, label: "Pouco conhecida fora da área" },
          { v: 2, label: "Conhecida, mas pouco ouvida" },
          { v: 3, label: "Ouvida pelos gestores" },
          { v: 4, label: "Ouvida pelos gestores e pela diretoria" },
        ],
      },
      {
        id: "tra_conduz",
        prompt: "Consegue conduzir uma conversa com outra área e registrar o que ouviu?",
        probe: "Peça um resumo escrito de uma reunião recente.",
        options: [
          { v: 1, label: "Ainda não" },
          { v: 2, label: "Conduz, mas registra pouco" },
          { v: 3, label: "Conduz e registra o essencial" },
          { v: 4, label: "Conduz, registra e encaminha os próximos passos" },
        ],
      },
      {
        id: "tra_cobra",
        prompt: "Consegue cobrar prazos e combinados de outras áreas?",
        probe: "Pergunte: “Quando alguém atrasa uma informação que você precisa, o que você faz?”",
        options: [
          { v: 1, label: "Evita cobrar" },
          { v: 2, label: "Só cobra com apoio do chefe" },
          { v: 3, label: "Cobra diretamente" },
          { v: 4, label: "Cobra e resolve sem precisar escalar" },
        ],
      },
    ],
  },
  {
    key: "tempo",
    title: "Tem tempo e apoio",
    short: "Tempo",
    questions: [
      {
        id: "tem_horas",
        prompt: "Quanto tempo por semana pode dedicar ao diagnóstico e ao plano?",
        probe: "Confirme com o gestor direto, não só com a pessoa.",
        options: [
          { v: 1, label: "Menos de 1 hora" },
          { v: 2, label: "1 a 2 horas" },
          { v: 3, label: "3 a 5 horas" },
          { v: 4, label: "Mais de 5 horas, reservadas na agenda" },
        ],
      },
      {
        id: "tem_patrocinio",
        prompt: "A diretoria apoia que a pessoa assuma esse papel?",
        probe: "Pergunte ao patrocinador se o papel foi comunicado às áreas.",
        options: [
          { v: 1, label: "Não foi conversado" },
          { v: 2, label: "Apoio informal" },
          { v: 3, label: "Combinado com o gestor direto" },
          { v: 4, label: "Formalizado e comunicado às áreas" },
        ],
      },
      {
        id: "tem_organizacao",
        prompt: "Mantém registros e retorna pendências sem precisar de lembrete?",
        probe: "Pergunte a quem trabalha junto no dia a dia.",
        options: [
          { v: 1, label: "Raramente" },
          { v: 2, label: "Às vezes" },
          { v: 3, label: "Quase sempre" },
          { v: 4, label: "Sempre, com controle próprio" },
        ],
      },
    ],
  },
];

export const STEWARD_QUESTIONS = STEWARD_DIMENSIONS.flatMap((d) => d.questions.map((q) => ({ ...q, dim: d })));

export interface StewardReview {
  id: string;
  organization_id: string;
  name: string;
  role: string | null;
  area: string | null;
  answers: Record<string, number>;
  notes: string | null;
  chosen: boolean;
  created_at?: string;
  updated_at?: string;
}

export type StewardProfileKey = "pronto" | "apoio" | "negocio" | "dados" | "sem_tempo" | "ainda_nao" | "incompleto";

export interface StewardResult {
  /** 0–100 por dimensão (null se nada respondido). */
  dims: Record<StewardDimension["key"], number | null>;
  overall: number | null;
  answered: number;
  total: number;
  profile: { key: StewardProfileKey; title: string; summary: string };
  /** O que fazer para a pessoa dar conta do papel. */
  support: string[];
}

const toPct = (v: number) => ((v - 1) / 3) * 100;

const SUPPORT: Record<StewardDimension["key"], string> = {
  negocio: "Faça a primeira rodada de entrevistas junto com um gestor que conhece o fluxo de ponta a ponta.",
  dados: "Coloque ao lado da pessoa alguém que monta os relatórios (ou o consultor Moulis) para as perguntas de fontes e qualidade.",
  transito: "Peça ao patrocinador para apresentar o papel às áreas e abrir as primeiras agendas.",
  tempo: "Combine com o gestor direto horas fixas na semana e formalize o papel antes de começar.",
};

export function scoreSteward(r: Pick<StewardReview, "answers">): StewardResult {
  const a = r.answers || {};
  const dims = Object.fromEntries(
    STEWARD_DIMENSIONS.map((d) => {
      const vals = d.questions.map((q) => a[q.id]).filter((v): v is number => typeof v === "number" && v > 0);
      return [d.key, vals.length ? vals.reduce((s, v) => s + toPct(v), 0) / vals.length : null];
    }),
  ) as StewardResult["dims"];
  const answered = STEWARD_QUESTIONS.filter((q) => (a[q.id] ?? 0) > 0).length;
  const total = STEWARD_QUESTIONS.length;
  const present = Object.values(dims).filter((v): v is number => v !== null);
  const overall = present.length ? Math.round(present.reduce((s, v) => s + v, 0) / present.length) : null;

  const support = STEWARD_DIMENSIONS.filter((d) => (dims[d.key] ?? 0) < 50).map((d) => SUPPORT[d.key]);
  const lowHours = (a.tem_horas ?? 0) > 0 && a.tem_horas <= 1;

  let profile: StewardResult["profile"];
  if (answered < Math.ceil(total * 0.7))
    profile = { key: "incompleto", title: "Avaliação incompleta", summary: "Responda ao menos 8 das 11 perguntas para ver a recomendação." };
  else if (lowHours)
    profile = { key: "sem_tempo", title: "Sem tempo reservado", summary: "Tem perfil, mas com menos de 1 hora por semana o diagnóstico para. Negocie a agenda antes de começar." };
  else if ((overall ?? 0) >= 70 && present.every((v) => v >= 50))
    profile = { key: "pronto", title: "Em condições de conduzir", summary: "Tem negócio, dados, trânsito e tempo suficientes para ser a ponte entre as áreas e o diagnóstico." };
  else if ((dims.negocio ?? 0) >= 60 && (dims.transito ?? 0) >= 50 && (dims.dados ?? 0) < 50)
    profile = { key: "negocio", title: "Forte no negócio, precisa de apoio em dados", summary: "Conduz bem as conversas; nas perguntas de fontes e qualidade, trabalhe em dupla com quem monta os relatórios." };
  else if ((dims.dados ?? 0) >= 60 && ((dims.negocio ?? 0) < 50 || (dims.transito ?? 0) < 50))
    profile = { key: "dados", title: "Forte em dados, precisa de trânsito no negócio", summary: "Entende os números; precisa de um padrinho na diretoria para abrir portas e de um gestor ao lado nas conversas de negócio." };
  else if ((overall ?? 0) >= 45)
    profile = { key: "apoio", title: "Consegue conduzir com apoio", summary: "Dá conta do papel com acompanhamento próximo do consultor nas primeiras semanas." };
  else profile = { key: "ainda_nao", title: "Ainda não", summary: "Hoje o papel pesaria demais. Avalie outra pessoa ou divida o papel entre duas pessoas." };

  return { dims, overall, answered, total, profile, support };
}
