// =====================================================================
// PRÓXIMOS PASSOS — transforma o diagnóstico num plano executável.
//
// Para cada resposta abaixo do ideal, o passo recomendado é o que leva
// a empresa ao PRÓXIMO nível daquela pergunta (não ao ideal): quem está
// no nível 1 recebe o passo 1→2, quem está no 3 recebe o 3→4.
// Cada passo diz o que fazer, como, o entregável, quem conduz, esforço,
// prazo e como saber que terminou — e é ajustado ao contexto informado
// (setor, sistemas, quem cuida de dados, objetivo e dores).
// =====================================================================
import {
  DIMENSIONS,
  GOALS,
  NOT_APPLICABLE,
  UNKNOWN,
  answerLabel,
  sectorOf,
  type AssessmentContext,
  type GoalKey,
  type QualityDim,
} from "./framework";
import { checkScore, questionScore, scopedDomains, type ScoreResult } from "./scoring";
import type { Assessment } from "./types";

// ---------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------
export type OwnerKey = "diretoria" | "gestor" | "dados" | "ti" | "juridico" | "area";
export type Effort = "baixo" | "medio" | "alto";

interface StepDef {
  title: string;
  how: string[];
  deliverable: string;
  owner: OwnerKey;
  effort: Effort;
  weeks: number;
  done: string;
  goals: GoalKey[];
  /** Atalho para uma ferramenta do app. */
  tool?: "glossario";
}

export interface PlanStep {
  id: string;
  kind: "question" | "check" | "discovery";
  title: string;
  /** Onde a empresa está hoje — o que o diagnóstico mostrou (com a evidência registrada). */
  now: string;
  /** Versão curta de "onde estão": só a resposta dada. */
  today: string;
  /** Por que o tema importa para o negócio, em linguagem simples. */
  matters: string;
  /** Aonde queremos chegar com este passo. */
  target: string;
  /** A ideia do passo, em uma frase, sem jargão. */
  idea: string;
  /** Por que agora: limita o nível, seu objetivo, sua dor, ponto crítico. */
  signals: string[];
  /** Texto corrido (situação + importância + sinais) — usado em Prioridades e no assistente. */
  why: string;
  how: string[];
  deliverable: string;
  owner: string;
  effort: Effort;
  weeks: number;
  done: string;
  wave: 1 | 2 | 3;
  priority: number;
  origin: string;
  /** Selos curtos: "Limita o nível", "Seu objetivo", "Responde à sua dor"… */
  tags: string[];
  /** Mantido para compatibilidade com telas antigas. */
  reason: string;
  tool?: "glossario";
}

export interface Profile {
  key: string;
  title: string;
  summary: string;
  focus: string;
}

export interface Roadmap {
  profile: Profile;
  steps: PlanStep[];
  /** Quantos passos cabem na Onda 1 com a equipe informada. */
  capacity: number;
  capacityNote: string;
}

export const EFFORT_LABEL: Record<Effort, string> = { baixo: "Esforço baixo", medio: "Esforço médio", alto: "Esforço alto" };

export const WAVES = {
  1: { label: "Onda 1 · 0–30 dias", short: "Próximos 30 dias", focus: "Fundamentos que limitam o nível e riscos críticos" },
  2: { label: "Onda 2 · 30–60 dias", short: "30 a 60 dias", focus: "Estrutura: definições, consolidação e conferência de qualidade" },
  3: { label: "Onda 3 · 60–90 dias", short: "60 a 90 dias", focus: "Escala: automação, adoção e casos avançados" },
} as const;

// ---------------------------------------------------------------------
// Biblioteca de passos por pergunta (nível atual → próximo nível)
// ---------------------------------------------------------------------
type Steps = { topic: string; 1: StepDef; 2?: StepDef; 3: StepDef };

const Q: Record<string, Steps> = {
  est_uso: {
    topic: "como os dados entram nas decisões da gestão",
    1: { title: "Escolher 5 indicadores e revisá-los em reunião fixa", how: ["Com a diretoria, escolha até 5 indicadores que explicam o resultado do mês.", "Marque uma reunião curta (30 min) quinzenal, sempre no mesmo dia.", "Leve os números num formato único e registre as decisões tomadas."], deliverable: "Painel de 1 página com 5 indicadores + registro das decisões", owner: "diretoria", effort: "baixo", weeks: 2, done: "Três reuniões seguidas com os mesmos indicadores e decisões registradas", goals: ["confianca", "visao"] },
    2: { title: "Transformar relatórios avulsos em ritual com metas", how: ["Liste os relatórios mais pedidos no último trimestre.", "Fique com os indicadores que se repetem e dê a cada um uma meta.", "Defina gatilhos: 'se X passar de Y, fazemos Z'."], deliverable: "Calendário de reuniões + indicadores com meta e gatilho", owner: "diretoria", effort: "baixo", weeks: 3, done: "Cada indicador da reunião tem meta, responsável e gatilho de ação", goals: ["visao", "confianca"] },
    3: { title: "Levar os indicadores para as decisões do dia a dia e o planejamento", how: ["Escolha uma decisão recorrente (compra, escala, preço, agenda) e defina qual número a orienta.", "Crie uma visão diária ou semanal para quem toma essa decisão.", "Use o histórico no planejamento anual com três cenários simples."], deliverable: "Uma decisão operacional guiada por regra + orçamento com cenários", owner: "gestor", effort: "medio", weeks: 6, done: "A decisão escolhida segue a regra por um mês inteiro", goals: ["crescer", "visao"] },
  },
  est_prioridade: {
    topic: "se as iniciativas de dados têm meta, patrocinador e orçamento",
    1: { title: "Ligar uma iniciativa de dados a uma meta da diretoria", how: ["Escolha a dor de negócio mais cara (margem, inadimplência, retrabalho, prazo).", "Escreva a meta e o dado necessário para medi-la.", "Peça à diretoria um patrocinador para a iniciativa."], deliverable: "Ficha de 1 página: meta, dado necessário e patrocinador", owner: "diretoria", effort: "baixo", weeks: 2, done: "Diretoria aprovou a ficha com patrocinador nomeado", goals: ["confianca", "crescer"] },
    2: { title: "Dar dono e orçamento às iniciativas de dados", how: ["Liste as iniciativas em curso ou desejadas.", "Para cada uma: meta, patrocinador e custo estimado (horas ou R$).", "Aprove as duas prioritárias com orçamento."], deliverable: "Lista priorizada com meta, dono e orçamento", owner: "diretoria", effort: "baixo", weeks: 3, done: "Duas iniciativas com orçamento aprovado", goals: ["crescer"] },
    3: { title: "Criar o plano anual de dados com revisão trimestral", how: ["Consolide as iniciativas num plano de 12 meses ligado ao planejamento da empresa.", "Reserve o orçamento correspondente.", "Revise o plano a cada trimestre com a diretoria."], deliverable: "Plano anual de dados + pauta de revisão trimestral", owner: "diretoria", effort: "medio", weeks: 4, done: "Primeira revisão trimestral realizada", goals: ["crescer"] },
  },
  est_resultado: {
    topic: "como a empresa avalia se uma decisão deu resultado",
    1: { title: "Medir o antes × depois da próxima decisão importante", how: ["Escolha a próxima mudança relevante (preço, processo, campanha, política).", "Antes de mudar, anote o indicador atual e a meta esperada.", "Após 30 a 60 dias, compare e registre o aprendizado."], deliverable: "Registro antes × depois de uma decisão", owner: "gestor", effort: "baixo", weeks: 6, done: "Uma decisão avaliada com números e apresentada à diretoria", goals: ["confianca", "visao"] },
    2: { title: "Padronizar a avaliação das iniciativas", how: ["Crie um modelo simples: objetivo, indicador, linha de base, meta, data de revisão.", "Use o modelo em toda iniciativa acima de um valor combinado.", "Revise as fichas na reunião de rotina."], deliverable: "Modelo de ficha de iniciativa em uso", owner: "diretoria", effort: "baixo", weeks: 3, done: "Toda iniciativa nova nasce com a ficha preenchida", goals: ["confianca"] },
    3: { title: "Tornar a revisão de resultados parte do ritual de gestão", how: ["Inclua na pauta mensal a revisão das iniciativas abertas.", "Encerre ou ajuste as que não atingiram a meta.", "Guarde os aprendizados num histórico único."], deliverable: "Histórico de iniciativas com resultado", owner: "diretoria", effort: "baixo", weeks: 4, done: "Três meses de revisão registrados", goals: ["crescer"] },
  },
  fnt_oficial: {
    topic: "qual é a fonte oficial de cada informação",
    1: { title: "Fazer o inventário das fontes de dados", how: ["Numa planilha, liste cada informação importante e onde ela está hoje.", "Para cada uma, anote quem alimenta, quem usa e as versões concorrentes.", "Marque qual deveria ser a fonte oficial."], deliverable: "Inventário de fontes (informação × sistema × responsável)", owner: "dados", effort: "baixo", weeks: 2, done: "Toda informação usada nos relatórios da diretoria está no inventário", goals: ["confianca", "visao"] },
    2: { title: "Declarar e comunicar a fonte oficial de cada informação", how: ["Valide com cada área qual fonte vale.", "Aposente as planilhas concorrentes ou marque-as como 'não oficial'.", "Comunique a lista a todos que produzem relatórios."], deliverable: "Lista de fontes oficiais aprovada e comunicada", owner: "gestor", effort: "baixo", weeks: 2, done: "Nenhum relatório da diretoria usa fonte fora da lista", goals: ["confianca"] },
    3: { title: "Documentar as fontes com responsável e frequência", how: ["Complete o inventário: responsável, frequência de atualização, forma de acesso.", "Publique num local que todos consultem.", "Revise a cada trimestre ou quando um sistema mudar."], deliverable: "Inventário de fontes publicado e com data de revisão", owner: "dados", effort: "baixo", weeks: 2, done: "Inventário revisado e com data da última atualização", goals: ["confianca", "risco"] },
  },
  fnt_arquitetura: {
    topic: "onde ficam os dados usados nos relatórios",
    1: { title: "Criar uma pasta oficial e padronizada para os dados", how: ["Defina uma pasta oficial no drive, organizada por área.", "Padronize nome dos arquivos e a frequência das exportações.", "Combine que ninguém trabalha em cópia local dos arquivos oficiais."], deliverable: "Pasta oficial com padrão de nomes", owner: "dados", effort: "baixo", weeks: 1, done: "Os relatórios da diretoria leem só da pasta oficial", goals: ["manual", "visao"] },
    2: { title: "Centralizar os dados numa base única", how: ["Escolha uma base central simples (banco na nuvem ou o próprio {bi}).", "Carregue primeiro as duas fontes mais usadas.", "Aponte os relatórios principais para essa base."], deliverable: "Base central com as duas fontes principais", owner: "dados", effort: "medio", weeks: 4, done: "Os relatórios principais saem da base central", goals: ["visao", "manual"] },
    3: { title: "Automatizar as cargas com aviso de falha", how: ["Agende as cargas das fontes críticas.", "Crie um aviso (e-mail ou mensagem) quando uma carga falhar ou atrasar.", "Mostre a data da última atualização em todos os painéis."], deliverable: "Cargas agendadas + alerta de falha", owner: "ti", effort: "medio", weeks: 4, done: "Um mês sem falha de carga passar despercebida", goals: ["manual", "crescer"] },
  },
  fnt_acesso: {
    topic: "como os dados são extraídos dos sistemas",
    1: { title: "Mapear como extrair dados de cada sistema", how: ["Para {erp} e os demais sistemas, verifique o que existe: relatório exportável, API, acesso ao banco.", "Pergunte ao fornecedor de cada sistema o custo e o prazo de um acesso de leitura.", "Registre a dificuldade de cada um no inventário de fontes."], deliverable: "Mapa de acesso por sistema", owner: "ti", effort: "baixo", weeks: 2, done: "Cada sistema crítico tem forma de acesso e custo registrados", goals: ["manual", "visao"] },
    2: { title: "Tirar a extração da mão de uma só pessoa", how: ["Documente o passo a passo de cada extração.", "Solicite ao fornecedor um usuário técnico só de leitura.", "Treine uma segunda pessoa."], deliverable: "Manual de extração + usuário técnico de leitura", owner: "ti", effort: "baixo", weeks: 3, done: "Duas pessoas conseguem extrair os dados críticos", goals: ["risco", "manual"] },
    3: { title: "Garantir acesso direto a todos os sistemas críticos", how: ["Priorize os sistemas que ainda dependem de exportação manual.", "Negocie API ou acesso de leitura com os fornecedores.", "Guarde as credenciais técnicas no cofre de senhas."], deliverable: "Acesso direto documentado para todos os sistemas críticos", owner: "ti", effort: "medio", weeks: 6, done: "Nenhuma fonte crítica depende de exportação manual", goals: ["manual", "crescer"] },
  },
  fnt_backup: {
    topic: "se existe cópia de segurança dos dados críticos",
    1: { title: "Confirmar o backup dos sistemas e planilhas críticas", how: ["Pergunte ao fornecedor de cada sistema como e com que frequência é feito o backup.", "Liste as planilhas críticas que vivem no computador de alguém.", "Mova essas planilhas para um drive com histórico de versões."], deliverable: "Lista de fontes críticas com a situação do backup", owner: "ti", effort: "baixo", weeks: 1, done: "Toda fonte crítica tem backup confirmado", goals: ["risco"] },
    2: { title: "Testar a recuperação de um backup", how: ["Escolha um sistema ou base crítica.", "Peça a recuperação de uma cópia antiga em ambiente separado.", "Registre quanto tempo levou e o que faltou."], deliverable: "Relatório do teste de recuperação", owner: "ti", effort: "baixo", weeks: 2, done: "Uma recuperação testada com sucesso", goals: ["risco"] },
    3: { title: "Definir prazo de recuperação e testar periodicamente", how: ["Combine com a diretoria quanto tempo a empresa suporta sem cada sistema.", "Agende testes semestrais de recuperação.", "Inclua o prazo nos contratos com fornecedores."], deliverable: "Plano de continuidade de dados de 1 página", owner: "ti", effort: "baixo", weeks: 3, done: "Teste semestral no calendário e prazo aprovado", goals: ["risco"] },
  },
  qual_confianca: {
    topic: "o quanto os gestores confiam nos números",
    1: { title: "Medir a confiabilidade real com uma conciliação", how: ["Escolha o indicador mais contestado.", "Compare o número de duas fontes no último mês, linha a linha.", "Apresente as diferenças e as causas à diretoria."], deliverable: "Conciliação do indicador mais contestado", owner: "dados", effort: "baixo", weeks: 2, done: "Diferenças explicadas e causas priorizadas", goals: ["confianca"] },
    2: { title: "Trocar a conferência manual por conferências definidas", how: ["Liste o que as pessoas conferem antes de usar os números.", "Transforme cada conferência em regra escrita, com responsável.", "Sinalize nos relatórios quando o número já foi conferido."], deliverable: "Lista de conferências com responsável", owner: "dados", effort: "baixo", weeks: 3, done: "Os gestores deixam de refazer conferências nos relatórios principais", goals: ["confianca", "manual"] },
    3: { title: "Medir e publicar a qualidade dos indicadores principais", how: ["Crie um índice simples: % de conferências que passaram no período.", "Publique o índice junto com os indicadores.", "Defina meta de qualidade para cada indicador crítico."], deliverable: "Índice de qualidade publicado", owner: "dados", effort: "medio", weeks: 4, done: "Índice acompanhado por dois meses", goals: ["confianca"] },
  },
  qual_monitor: {
    topic: "se alguém confere a qualidade dos dados em rotina",
    1: { title: "Implantar 3 conferências de qualidade com responsável", how: ["Escolha 3 conferências simples: registros faltando, valores fora do padrão e divergência entre dois sistemas.", "Defina quem roda, quando e o que faz ao achar erro.", "Registre os erros encontrados numa planilha única."], deliverable: "3 conferências em rotina + registro de erros", owner: "dados", effort: "baixo", weeks: 2, done: "Quatro semanas seguidas de conferência registrada", goals: ["confianca"] },
    2: { title: "Tornar as conferências uma rotina com responsável", how: ["Escreva cada conferência que hoje é feita de vez em quando.", "Dê um responsável e uma frequência a cada uma.", "Revise os erros encontrados na reunião de rotina."], deliverable: "Calendário de conferências", owner: "dados", effort: "baixo", weeks: 2, done: "Nenhuma conferência crítica depende de alguém lembrar", goals: ["confianca"] },
    3: { title: "Automatizar as conferências com alertas", how: ["Transforme as conferências em consultas automáticas.", "Envie alerta ao responsável com prazo de correção.", "Acompanhe o tempo médio de correção."], deliverable: "Alertas automáticos de qualidade", owner: "dados", effort: "medio", weeks: 4, done: "Alertas rodando e erros corrigidos no prazo", goals: ["confianca", "manual"] },
  },
  qual_correcao: {
    topic: "o que acontece quando um erro de dado é encontrado",
    1: { title: "Corrigir os erros na origem, não no relatório", how: ["Combine: todo erro achado em relatório é corrigido no sistema de origem.", "Crie um canal único para reportar erros (formulário ou planilha).", "Defina quem corrige em cada área."], deliverable: "Canal de reporte de erros + responsáveis por área", owner: "gestor", effort: "baixo", weeks: 2, done: "Os erros do mês foram corrigidos na origem", goals: ["confianca"] },
    2: { title: "Registrar e acompanhar a correção dos erros", how: ["Registre cada erro: onde, causa, quem corrigiu e quando.", "Revise o registro na reunião mensal.", "Cobre prazo de correção."], deliverable: "Registro de erros com prazo", owner: "gestor", effort: "baixo", weeks: 2, done: "Todo erro registrado tem responsável e data de correção", goals: ["confianca"] },
    3: { title: "Prevenir os erros recorrentes na entrada", how: ["Identifique os 3 erros mais frequentes no registro.", "Crie validação ou trava no sistema (campo obrigatório, lista fechada).", "Meça a queda desses erros."], deliverable: "Validações de entrada para os erros mais frequentes", owner: "ti", effort: "medio", weeks: 4, done: "Queda dos 3 erros mais frequentes em dois meses", goals: ["confianca", "manual"] },
  },
  int_chave: {
    topic: "se clientes, itens e fornecedores têm o mesmo código entre sistemas",
    1: { title: "Criar a tabela de correspondência de códigos entre sistemas", how: ["Escolha a entidade mais cruzada ({entidade}).", "Monte uma planilha: código em {erp} × código nos demais sistemas.", "Valide uma amostra com a área e nomeie o responsável pela tabela."], deliverable: "Tabela de correspondência validada da entidade principal", owner: "dados", effort: "medio", weeks: 3, done: "Cruzamento entre dois sistemas sem perda de registros", goals: ["visao", "confianca"] },
    2: { title: "Completar a tabela de correspondência e dar um dono a ela", how: ["Cubra todos os sistemas principais e as outras entidades (clientes, fornecedores).", "Defina quem atualiza a tabela quando um cadastro novo é criado.", "Confira todo mês os códigos sem correspondência."], deliverable: "Tabela completa + rotina de atualização", owner: "dados", effort: "medio", weeks: 4, done: "Menos de 1% de registros sem correspondência", goals: ["visao"] },
    3: { title: "Instituir o cadastro mestre único", how: ["Defina o sistema de origem de cada cadastro.", "Crie a regra de criação e validação (campos obrigatórios, aprovação).", "Sincronize os demais sistemas a partir dele."], deliverable: "Cadastro mestre com fluxo de criação", owner: "ti", effort: "alto", weeks: 8, done: "Novos cadastros nascem só no sistema de origem", goals: ["visao", "crescer"] },
  },
  int_consol: {
    topic: "como os dados de fontes diferentes são juntados",
    1: { title: "Montar o primeiro cruzamento entre duas fontes", how: ["Escolha a pergunta de negócio que exige juntar duas áreas.", "Junte as duas fontes numa planilha usando a tabela de correspondência.", "Documente os passos para repetir no mês seguinte."], deliverable: "Primeiro relatório integrado + passo a passo", owner: "dados", effort: "baixo", weeks: 2, done: "O cruzamento é repetido no mês seguinte com o mesmo resultado", goals: ["visao"] },
    2: { title: "Trocar o copiar-e-colar por consolidação semiautomática", how: ["Liste os relatórios montados copiando e colando.", "Refaça o mais demorado com Power Query ou consulta equivalente.", "Meça as horas economizadas."], deliverable: "Relatório mais demorado consolidado automaticamente", owner: "dados", effort: "medio", weeks: 3, done: "O relatório atualiza com um clique", goals: ["manual"] },
    3: { title: "Padronizar regras e códigos na consolidação", how: ["Aplique as definições do Glossário nas transformações.", "Use a tabela de correspondência como chave única.", "Documente a origem de cada indicador."], deliverable: "Consolidação automática com regras documentadas", owner: "dados", effort: "medio", weeks: 6, done: "Dois relatórios diferentes dão o mesmo número para o mesmo indicador", goals: ["confianca", "visao", "manual"] },
  },
  int_linhagem: {
    topic: "de onde vem cada número dos indicadores principais",
    1: { title: "Documentar a origem dos 5 indicadores principais", how: ["Para cada indicador, escreva: sistema de origem, filtros e ajustes aplicados, onde é exibido.", "Guarde isso na ficha do indicador no Glossário.", "Peça a outra pessoa para refazer o cálculo seguindo a ficha."], deliverable: "Ficha de origem dos 5 indicadores principais", owner: "dados", effort: "baixo", weeks: 2, done: "Outra pessoa reproduz os números usando só as fichas", goals: ["confianca", "risco"], tool: "glossario" },
    3: { title: "Manter a origem documentada de todos os indicadores principais", how: ["Estenda as fichas a todos os indicadores dos painéis da diretoria.", "Atualize a ficha a cada mudança de cálculo.", "Revise a cada trimestre."], deliverable: "Glossário com a origem de todos os indicadores principais", owner: "dados", effort: "medio", weeks: 4, done: "Nenhum indicador do painel da diretoria sem ficha", goals: ["confianca"], tool: "glossario" },
  },
  gov_owner: {
    topic: "quem responde por cada área de dados",
    1: { title: "Nomear um responsável de negócio por área de dados", how: ["Liste as áreas de dados críticas (vendas, financeiro, pessoas, operação…).", "A diretoria nomeia, para cada uma, quem decide as regras e aprova mudanças.", "Comunique a lista a toda a empresa."], deliverable: "Matriz de responsáveis por área de dados, aprovada pela diretoria", owner: "diretoria", effort: "baixo", weeks: 1, done: "Lista publicada e comunicada", goals: ["confianca", "risco"] },
    2: { title: "Formalizar os responsáveis que hoje são informais", how: ["Transforme 'a quem todos recorrem' em papel formal: o que decide e o que aprova.", "Inclua o papel na descrição de cargo.", "Comunique a nova matriz."], deliverable: "Papel de responsável formalizado para cada área crítica", owner: "diretoria", effort: "baixo", weeks: 2, done: "Todas as áreas críticas com responsável formal", goals: ["confianca"] },
    3: { title: "Completar os papéis com apoio operacional e substituto", how: ["Para cada responsável, nomeie quem executa e confere o dado no dia a dia.", "Defina um substituto para férias e ausências.", "Estenda às áreas que ainda não têm responsável."], deliverable: "Matriz completa: responsável, apoio e substituto", owner: "diretoria", effort: "baixo", weeks: 2, done: "Áreas críticas com responsável, apoio e substituto", goals: ["risco"] },
  },
  gov_glossario: {
    topic: "se os indicadores têm definição escrita",
    1: { title: "Escrever a definição dos 5 indicadores mais usados", how: ["Escolha os 5 indicadores da reunião da diretoria.", "Para cada um: definição, fórmula, o que entra, o que sai e responsável.", "Use o Glossário de KPIs do app — a biblioteca tem modelos prontos."], deliverable: "Glossário com os 5 indicadores principais", owner: "dados", effort: "baixo", weeks: 2, done: "O responsável validou as 5 fichas", goals: ["confianca"], tool: "glossario" },
    2: { title: "Completar e validar as definições com os responsáveis", how: ["Atualize as fichas existentes e escreva as que faltam.", "Peça a validação formal do responsável de cada indicador.", "Registre versão e data de cada ficha."], deliverable: "Glossário validado dos indicadores principais", owner: "gestor", effort: "baixo", weeks: 3, done: "Todas as fichas principais validadas", goals: ["confianca"], tool: "glossario" },
    3: { title: "Tornar o Glossário a referência para divergências", how: ["Coloque o link do Glossário em cada painel.", "Toda divergência passa a ser resolvida pela ficha.", "Revise as fichas a cada trimestre."], deliverable: "Glossário ligado aos painéis + revisão trimestral", owner: "dados", effort: "baixo", weeks: 2, done: "Uma divergência resolvida pela ficha", goals: ["confianca"], tool: "glossario" },
  },
  gov_decisao: {
    topic: "como se resolvem divergências de números entre áreas",
    1: { title: "Combinar que a definição escrita prevalece", how: ["A diretoria formaliza: divergência de número se resolve pela definição escrita e pelo responsável do dado.", "Registre a primeira divergência resolvida assim.", "Comunique a regra a todos os gestores."], deliverable: "Regra de resolução de divergências comunicada", owner: "diretoria", effort: "baixo", weeks: 1, done: "Primeira divergência resolvida pela regra", goals: ["confianca"] },
    2: { title: "Registrar as decisões sobre dados", how: ["Crie um registro simples: divergência, decisão, quem decidiu, data.", "Use-o nas próximas divergências.", "Atualize o Glossário quando uma decisão mudar uma regra."], deliverable: "Registro de decisões sobre dados", owner: "gestor", effort: "baixo", weeks: 2, done: "Decisões do mês registradas", goals: ["confianca"] },
    3: { title: "Instalar uma rotina curta de governança", how: ["Reunião mensal de 30 minutos com os responsáveis de dados.", "Pauta fixa: divergências, mudanças de regra e prioridades.", "Decisões registradas e publicadas."], deliverable: "Rotina mensal de governança com ata", owner: "diretoria", effort: "baixo", weeks: 4, done: "Três reuniões realizadas com ata", goals: ["confianca", "crescer"] },
  },
  seg_cred: {
    topic: "quem tem acesso aos sistemas críticos",
    1: { title: "Fazer o inventário de acessos aos sistemas críticos", how: ["Liste os sistemas críticos e quem acessa cada um — sem registrar senhas.", "Identifique contas compartilhadas e de ex-colaboradores.", "Revogue os acessos indevidos."], deliverable: "Inventário de acessos (sem senhas)", owner: "ti", effort: "baixo", weeks: 1, done: "Nenhum ex-colaborador com acesso ativo", goals: ["risco"] },
    2: { title: "Tirar as senhas de e-mails e planilhas", how: ["Adote um cofre de senhas corporativo.", "Migre para ele as credenciais compartilhadas e técnicas.", "Troque as senhas que já circularam por e-mail."], deliverable: "Cofre de senhas com as credenciais críticas", owner: "ti", effort: "baixo", weeks: 2, done: "Nenhuma senha crítica em e-mail ou planilha", goals: ["risco"] },
    3: { title: "Revisar acessos periodicamente e no desligamento", how: ["Inclua a revogação de acessos no checklist de desligamento.", "Revise os acessos a cada trimestre.", "Ative verificação em duas etapas nos sistemas críticos."], deliverable: "Checklist de desligamento + revisão trimestral", owner: "ti", effort: "baixo", weeks: 2, done: "Primeira revisão trimestral concluída", goals: ["risco"] },
  },
  seg_acesso: {
    topic: "como o acesso aos dados é controlado",
    1: { title: "Restringir o acesso aos dados mais sensíveis", how: ["Identifique os dados sensíveis: salários, dados pessoais, margens, contratos.", "Veja quem acessa cada um hoje.", "Restrinja a quem realmente precisa."], deliverable: "Lista de dados sensíveis com acesso revisado", owner: "ti", effort: "baixo", weeks: 2, done: "Dados sensíveis acessíveis só a quem precisa", goals: ["risco"] },
    2: { title: "Classificar os dados por sensibilidade", how: ["Use três níveis: interno, restrito e pessoal.", "Classifique cada fonte do inventário.", "Ajuste os perfis de acesso a cada nível."], deliverable: "Inventário de fontes classificado", owner: "ti", effort: "medio", weeks: 3, done: "Perfis de acesso ajustados à classificação", goals: ["risco"] },
    3: { title: "Revisar acessos e registrar quem acessou", how: ["Ative o registro de acesso nos sistemas que permitem.", "Revise os acessos restritos a cada trimestre.", "Registre as exceções aprovadas."], deliverable: "Revisão trimestral + registro de acessos ativo", owner: "ti", effort: "medio", weeks: 3, done: "Uma revisão trimestral concluída", goals: ["risco"] },
  },
  seg_lgpd: {
    topic: "onde estão os dados pessoais e como são tratados",
    1: { title: "Mapear onde estão os dados pessoais", how: ["Liste sistemas e planilhas com dados de {pessoas}.", "Anote para que cada dado é usado.", "Identifique cópias desnecessárias (planilhas soltas, e-mails)."], deliverable: "Mapa de dados pessoais", owner: "juridico", effort: "medio", weeks: 3, done: "Todos os sistemas e planilhas com dados pessoais mapeados", goals: ["risco"] },
    2: { title: "Definir a base legal e restringir o acesso a dados pessoais", how: ["Para cada uso, registre a base legal (contrato, obrigação legal, consentimento…).", "Restrinja o acesso a quem precisa.", "Apague as cópias desnecessárias."], deliverable: "Mapa com base legal e acessos restritos", owner: "juridico", effort: "medio", weeks: 4, done: "Nenhum dado pessoal sem base legal registrada", goals: ["risco"] },
    3: { title: "Completar o programa de LGPD", how: ["Nomeie o encarregado (DPO).", "Defina prazos de retenção e descarte.", "Crie o processo para atender pedidos dos titulares."], deliverable: "Encarregado nomeado + política de retenção + canal do titular", owner: "juridico", effort: "medio", weeks: 6, done: "Canal do titular publicado e testado", goals: ["risco"] },
  },
  pes_skill: {
    topic: "a capacidade do time que produz os números",
    1: { title: "Definir quem vai produzir as análises", how: ["Decida entre formar alguém interno ou contratar apoio externo.", "Reserve horas semanais protegidas para essa função.", "Comece por um relatório que a diretoria usa."], deliverable: "Responsável por análises com horas reservadas", owner: "diretoria", effort: "baixo", weeks: 2, done: "O primeiro relatório sai pela nova pessoa ou apoio", goals: ["manual", "crescer"] },
    2: { title: "Capacitar o time na ferramenta que já existe", how: ["Escolha uma trilha prática de Excel avançado ou {bi}.", "Aprenda aplicando num relatório real da empresa.", "Reserve horas semanais para a formação."], deliverable: "Trilha concluída com uma entrega real", owner: "dados", effort: "baixo", weeks: 6, done: "Um relatório refeito pelo time após a trilha", goals: ["manual"] },
    3: { title: "Ampliar a capacidade para análises novas", how: ["Treine SQL ou uma linguagem de análise em quem já domina o BI.", "Crie um canal para pedidos de análise da gestão.", "Meça o tempo de resposta."], deliverable: "Canal de pedidos de análise + time treinado", owner: "dados", effort: "medio", weeks: 8, done: "Perguntas novas respondidas em até uma semana", goals: ["crescer"] },
  },
  pes_letramento: {
    topic: "se os gestores interpretam os indicadores",
    1: { title: "Ensinar os gestores a ler os indicadores da própria área", how: ["Faça sessões de 1 hora com cada área usando os números dela.", "Explique meta × realizado, tendência e sazonalidade com exemplos reais.", "Entregue um guia de leitura de 1 página por painel."], deliverable: "Guia de leitura de cada painel + sessões realizadas", owner: "dados", effort: "baixo", weeks: 3, done: "Cada gestor apresenta os próprios números na reunião", goals: ["confianca", "visao"] },
    3: { title: "Formar multiplicadores nas áreas", how: ["Escolha um multiplicador por área.", "Ele apresenta os números da área e propõe análises.", "Faça uma troca mensal entre os multiplicadores."], deliverable: "Rede de multiplicadores ativa", owner: "gestor", effort: "baixo", weeks: 6, done: "Cada área tem um multiplicador ativo", goals: ["crescer"] },
  },
  pes_dependencia: {
    topic: "a dependência de pessoas-chave",
    1: { title: "Documentar as 3 rotinas de dados mais críticas", how: ["Identifique as rotinas que só uma pessoa sabe fazer.", "Grave a tela ou escreva o passo a passo de cada uma.", "Guarde num local compartilhado."], deliverable: "Passo a passo das 3 rotinas críticas", owner: "dados", effort: "baixo", weeks: 2, done: "Documentação revisada por outra pessoa", goals: ["risco"] },
    2: { title: "Treinar um substituto para as rotinas críticas", how: ["Escolha um substituto.", "Ele executa as rotinas acompanhado, depois sozinho.", "Atualize a documentação com as dúvidas que surgirem."], deliverable: "Substituto treinado", owner: "gestor", effort: "baixo", weeks: 4, done: "O substituto executou o fechamento sozinho", goals: ["risco"] },
    3: { title: "Distribuir o conhecimento e manter a documentação viva", how: ["Reveze as rotinas entre pessoas.", "Atualize a documentação a cada mudança.", "Inclua as rotinas na integração de novos colaboradores."], deliverable: "Escala de revezamento + documentação atualizada", owner: "gestor", effort: "baixo", weeks: 4, done: "Nenhuma rotina crítica depende de uma única pessoa", goals: ["risco"] },
  },
  pes_adocao: {
    topic: "se os painéis são usados sem cobrança",
    1: { title: "Levar os painéis para dentro das reuniões", how: ["Use o painel (não uma planilha paralela) na reunião de rotina.", "Aposente os relatórios paralelos que duplicam o painel.", "Pergunte o que falta no painel para decidir e ajuste."], deliverable: "Painel usado na reunião + lista de relatórios aposentados", owner: "gestor", effort: "baixo", weeks: 3, done: "Nenhum relatório paralelo na reunião por um mês", goals: ["visao", "manual"] },
    3: { title: "Tornar os painéis parte do dia a dia", how: ["Envie um resumo automático para cada gestor.", "Meça quem acessa os painéis.", "Converse com quem não usa para entender o motivo."], deliverable: "Resumo automático + medição de uso", owner: "dados", effort: "baixo", weeks: 3, done: "Uso semanal pela maioria dos gestores", goals: ["visao"] },
  },
  ia_automacao: {
    topic: "quanto das rotinas de dados é automatizado",
    1: { title: "Automatizar a rotina manual que mais consome horas", how: ["Liste as rotinas de dados e as horas que cada uma consome por mês.", "Escolha a de maior tempo e menor complexidade.", "Automatize com a ferramenta que já existe ({bi}, Power Query, agendamento)."], deliverable: "Rotina automatizada + horas economizadas", owner: "dados", effort: "medio", weeks: 3, done: "A rotina roda sem ninguém por um mês", goals: ["manual"] },
    3: { title: "Monitorar as automações críticas", how: ["Liste as automações críticas.", "Configure aviso de falha em cada uma.", "Documente como reexecutar."], deliverable: "Automações com aviso de falha", owner: "dados", effort: "baixo", weeks: 2, done: "Nenhuma falha silenciosa em um mês", goals: ["manual", "crescer"] },
  },
  ia_politica: {
    topic: "as regras de uso de IA com dados da empresa",
    1: { title: "Publicar as regras básicas de uso de IA", how: ["Defina o que não pode ir para ferramentas de IA: dados pessoais, contratos, senhas, dados de clientes.", "Indique as ferramentas aprovadas.", "Comunique a todos em uma página."], deliverable: "Política de uso de IA de 1 página", owner: "juridico", effort: "baixo", weeks: 1, done: "Política comunicada a todos os colaboradores", goals: ["risco", "crescer"] },
    3: { title: "Aprovar e acompanhar os casos de uso de IA", how: ["Registre os casos de uso em curso.", "Aprove os que usam dados governados.", "Acompanhe resultado e riscos."], deliverable: "Registro de casos de IA aprovados", owner: "diretoria", effort: "baixo", weeks: 3, done: "Todos os casos em uso estão registrados", goals: ["crescer"] },
  },
  ia_dados: {
    topic: "se os dados sustentam os casos de IA desejados",
    1: { title: "Escolher um caso de IA ligado a uma dor real", how: ["Liste tarefas repetitivas ou decisões com muito dado (previsão, triagem, leitura de documentos).", "Escolha uma com ganho claro e dado já existente.", "Defina como medir o resultado."], deliverable: "Ficha do caso de IA priorizado", owner: "diretoria", effort: "baixo", weeks: 2, done: "Caso aprovado com métrica de sucesso", goals: ["crescer"] },
    2: { title: "Preparar os dados do caso de IA priorizado", how: ["Liste os dados necessários e onde estão.", "Confira qualidade e histórico mínimo.", "Corrija as lacunas mais graves antes de testar."], deliverable: "Base preparada para o caso de IA", owner: "dados", effort: "medio", weeks: 6, done: "Base validada pelo responsável da área", goals: ["crescer"] },
    3: { title: "Testar o caso de IA contra a situação atual", how: ["Rode um piloto de escopo pequeno.", "Compare com o resultado sem IA.", "Decida escalar ou encerrar com base nos números."], deliverable: "Resultado do piloto com comparação", owner: "dados", effort: "medio", weeks: 6, done: "Decisão de escalar tomada com números", goals: ["crescer"] },
  },
};

// ---------------------------------------------------------------------
// Linguagem simples: por que cada tema importa e a ideia de cada passo
// (para quem não é da área de dados entender o "porquê" antes do "como").
// ---------------------------------------------------------------------
type Plain = { matters: string; goal: string; idea: { 1: string; 2?: string; 3: string } };

const PLAIN: Record<string, Plain> = {
  est_uso: {
    matters: "Quando os números não entram nas decisões, a empresa decide pela intuição e só descobre o problema quando ele já custou caro.",
    goal: "Os números certos olhados em rotina e orientando decisões — não só explicando o passado.",
    idea: {
      1: "Começar pequeno: poucos números, sempre os mesmos, olhados juntos em dia fixo.",
      2: "Os relatórios já existem; falta transformá-los num hábito com meta e com o que fazer quando o número sai do esperado.",
      3: "Levar os números da reunião da diretoria para as decisões do dia a dia.",
    },
  },
  est_prioridade: {
    matters: "Sem meta e sem patrocinador, projetos de dados viram 'coisa do TI', perdem prioridade e não mostram retorno.",
    goal: "Cada iniciativa de dados ligada a uma meta do negócio, com dono e orçamento.",
    idea: {
      1: "Escolher um problema de negócio caro e mostrar como o dado ajuda a resolvê-lo, com alguém da diretoria apoiando.",
      2: "Tratar as iniciativas de dados como qualquer investimento: objetivo, dono e orçamento.",
      3: "Ter um plano anual de dados ligado ao plano da empresa e revisado com frequência.",
    },
  },
  est_resultado: {
    matters: "Sem medir o antes e o depois, não dá para saber o que funcionou — a empresa repete erros e abandona acertos.",
    goal: "Toda decisão importante avaliada com números: o que se esperava × o que aconteceu.",
    idea: {
      1: "Antes da próxima mudança importante, anotar o número de hoje e comparar depois.",
      2: "Usar sempre o mesmo modelo simples para avaliar se uma iniciativa deu resultado.",
      3: "Revisar os resultados das iniciativas como parte da rotina de gestão.",
    },
  },
  fnt_oficial: {
    matters: "Quando a mesma informação existe em vários lugares, cada área traz um número diferente e a reunião vira discussão sobre qual está certo.",
    goal: "Para cada informação importante, todos sabem qual é a fonte que vale.",
    idea: {
      1: "Listar onde está cada informação importante — o primeiro passo para escolher qual vale.",
      2: "Combinar com as áreas qual fonte é a oficial e deixar de usar as concorrentes.",
      3: "Deixar a lista de fontes oficiais escrita, com responsável, e mantê-la atualizada.",
    },
  },
  fnt_arquitetura: {
    matters: "Dados espalhados em arquivos pessoais se perdem, ficam desatualizados e fazem cada relatório levar horas para ser montado.",
    goal: "Os dados da empresa num lugar único e organizado, de onde saem todos os relatórios.",
    idea: {
      1: "Dar um endereço único e organizado para os arquivos de dados da empresa.",
      2: "Juntar os dados principais num só lugar, de onde saem todos os relatórios.",
      3: "Fazer os dados chegarem sozinhos a esse lugar, com aviso quando algo falhar.",
    },
  },
  fnt_acesso: {
    matters: "Se tirar dados dos sistemas é difícil ou depende de uma pessoa, todo relatório atrasa e qualquer ausência para a operação.",
    goal: "Tirar dados dos sistemas é simples, documentado e não depende de uma só pessoa.",
    idea: {
      1: "Descobrir como cada sistema permite tirar os dados, e quanto isso custa.",
      2: "Escrever o passo a passo da extração e garantir que mais de uma pessoa saiba fazer.",
      3: "Ter acesso direto e seguro aos dados de todos os sistemas importantes.",
    },
  },
  fnt_backup: {
    matters: "Perder um sistema ou uma planilha crítica sem cópia pode parar a operação e apagar anos de histórico.",
    goal: "A empresa consegue recuperar seus dados críticos, e isso já foi testado.",
    idea: {
      1: "Confirmar que existe cópia de segurança de tudo que é crítico.",
      2: "Provar que a cópia funciona, recuperando um backup de verdade.",
      3: "Combinar quanto tempo a empresa aguenta sem cada sistema e testar isso com frequência.",
    },
  },
  qual_confianca: {
    matters: "Quando os gestores não confiam nos números, eles conferem tudo à mão ou ignoram os relatórios — perde-se tempo e as decisões voltam a ser no 'achismo'.",
    goal: "Os gestores usam os números sem precisar conferir tudo de novo.",
    idea: {
      1: "Mostrar com fatos onde os números erram e por quê, em vez de discutir impressões.",
      2: "Transformar a conferência que cada um faz por conta própria em regras combinadas, feitas uma vez por um responsável.",
      3: "Medir a qualidade dos números e mostrá-la junto com eles.",
    },
  },
  qual_monitor: {
    matters: "Sem conferência em rotina, os erros só aparecem quando alguém já usou o número errado para decidir.",
    goal: "Os erros são pegos por uma conferência de rotina antes de chegar à gestão.",
    idea: {
      1: "Começar com poucas conferências simples, feitas sempre, por alguém definido.",
      2: "Transformar as conferências de vez em quando em rotina, com responsável.",
      3: "Deixar o sistema avisar sozinho quando um dado sair do padrão.",
    },
  },
  qual_correcao: {
    matters: "Corrigir o erro só no relatório faz o mesmo erro voltar todo mês e cada área ficar com uma versão diferente.",
    goal: "Erro encontrado é corrigido na origem — e não volta no mês seguinte.",
    idea: {
      1: "Combinar que todo erro é corrigido no sistema de origem, por quem cuida daquele dado.",
      2: "Anotar os erros e acompanhar se foram corrigidos no prazo.",
      3: "Atacar a causa dos erros que mais se repetem, impedindo que entrem no sistema.",
    },
  },
  int_chave: {
    matters: "Se o mesmo cliente ou produto tem códigos diferentes em cada sistema, não dá para juntar as informações — e cada cruzamento vira trabalho manual sujeito a erro.",
    goal: "Clientes, produtos e fornecedores reconhecidos como o mesmo em todos os sistemas.",
    idea: {
      1: "Criar uma 'tradução' entre os códigos dos sistemas para o cadastro mais importante.",
      2: "Completar essa tradução para os demais cadastros e dar a alguém a tarefa de mantê-la.",
      3: "Ter um único lugar onde cada cadastro nasce, e os outros sistemas copiarem dele.",
    },
  },
  int_consol: {
    matters: "Juntar dados copiando e colando consome horas, depende de quem sabe fazer e abre espaço para erros que ninguém vê.",
    goal: "Juntar dados de áreas diferentes sem copiar e colar, sempre com as mesmas regras.",
    idea: {
      1: "Fazer o primeiro cruzamento entre duas áreas e anotar como foi feito, para repetir.",
      2: "Trocar o copiar-e-colar por uma consolidação que se atualiza com um clique.",
      3: "Garantir que todos os relatórios juntem os dados com as mesmas regras.",
    },
  },
  int_linhagem: {
    matters: "Quando ninguém sabe dizer de onde vem um número, qualquer questionamento trava a reunião e só uma pessoa consegue explicar.",
    goal: "Qualquer pessoa consegue dizer de onde vem cada número importante.",
    idea: {
      1: "Anotar, para os indicadores principais, de onde vem cada número e que ajustes ele sofre.",
      3: "Manter essa explicação atualizada para todos os indicadores importantes.",
    },
  },
  gov_owner: {
    matters: "Sem um responsável por cada tipo de dado, ninguém decide as regras: os problemas ficam sem dono e as divergências se arrastam.",
    goal: "Cada tipo de dado importante tem um responsável que decide as regras.",
    idea: {
      1: "Dar nome a quem decide as regras de cada área de dados — como já existe um dono para o caixa ou para o estoque.",
      2: "Oficializar quem já faz esse papel informalmente.",
      3: "Garantir apoio e substituto para cada responsável.",
    },
  },
  gov_glossario: {
    matters: "Sem uma definição escrita, cada área calcula o mesmo indicador de um jeito e os números nunca batem.",
    goal: "Cada indicador principal tem uma definição escrita que todos seguem.",
    idea: {
      1: "Escrever, em linguagem simples, como se calcula cada indicador principal.",
      2: "Completar as definições e ter o aval de quem responde por cada indicador.",
      3: "Usar as definições escritas como a palavra final quando houver dúvida.",
    },
  },
  gov_decisao: {
    matters: "Se divergências de números se resolvem por quem tem mais poder ou fala mais alto, o problema volta na próxima reunião.",
    goal: "Divergências de números resolvidas por regra combinada, não por discussão.",
    idea: {
      1: "Combinar uma regra simples: em caso de divergência, vale a definição escrita e o responsável pelo dado.",
      2: "Anotar cada decisão sobre dados para não discutir o mesmo assunto de novo.",
      3: "Ter uma conversa curta e periódica entre os responsáveis para decidir os temas de dados.",
    },
  },
  seg_cred: {
    matters: "Senhas compartilhadas e acessos de ex-colaboradores são a porta mais comum para vazamentos e fraudes.",
    goal: "Só quem deve tem acesso aos sistemas, e as senhas estão protegidas.",
    idea: {
      1: "Saber quem acessa cada sistema importante e cortar o que não deveria existir.",
      2: "Guardar as senhas da empresa num cofre seguro, e não em e-mails ou planilhas.",
      3: "Revisar os acessos com frequência e sempre que alguém sair da empresa.",
    },
  },
  seg_acesso: {
    matters: "Se todos veem tudo, informações como salários, margens e dados de clientes ficam expostas sem necessidade.",
    goal: "Cada pessoa vê apenas os dados de que precisa para o trabalho.",
    idea: {
      1: "Proteger primeiro as informações mais sensíveis, deixando o acesso só para quem precisa.",
      2: "Separar os dados por nível de sensibilidade e dar acesso conforme o nível.",
      3: "Revisar periodicamente quem acessa o quê e manter registro.",
    },
  },
  seg_lgpd: {
    matters: "A LGPD prevê multas de até 2% do faturamento, e um incidente com dados pessoais afeta a confiança de clientes e colaboradores.",
    goal: "Os dados pessoais estão mapeados, protegidos e tratados conforme a lei.",
    idea: {
      1: "Saber onde estão os dados pessoais que a empresa guarda e para que servem.",
      2: "Ter justificativa legal para cada uso e limitar quem acessa.",
      3: "Completar as obrigações da LGPD: encarregado, prazos de guarda e canal para os titulares.",
    },
  },
  pes_skill: {
    matters: "Se ninguém tem tempo ou preparo para produzir as análises, as perguntas da gestão ficam sem resposta ou demoram semanas.",
    goal: "A empresa tem gente com tempo e preparo para responder às perguntas da gestão.",
    idea: {
      1: "Definir quem vai cuidar das análises e reservar tempo para isso.",
      2: "Capacitar o time na ferramenta que a empresa já tem, aplicando em casos reais.",
      3: "Ampliar o time para responder perguntas novas com rapidez.",
    },
  },
  pes_letramento: {
    matters: "Um painel bem feito não ajuda se os gestores não sabem ler os números — eles voltam a pedir explicação ou ignoram o painel.",
    goal: "Os gestores leem e explicam os próprios números sem ajuda.",
    idea: {
      1: "Ensinar cada gestor a ler os números da própria área, com exemplos reais.",
      3: "Formar em cada área alguém que ajude os colegas a usar os números.",
    },
  },
  pes_dependencia: {
    matters: "Se só uma pessoa sabe fazer as rotinas de dados, férias, doença ou saída dela param os relatórios da empresa.",
    goal: "As rotinas de dados continuam funcionando mesmo se alguém sair.",
    idea: {
      1: "Colocar no papel as rotinas que hoje só existem na cabeça de uma pessoa.",
      2: "Preparar uma segunda pessoa para executar essas rotinas.",
      3: "Fazer o conhecimento circular entre várias pessoas.",
    },
  },
  pes_adocao: {
    matters: "Painéis que ninguém usa são investimento perdido — e as planilhas paralelas continuam gerando números diferentes.",
    goal: "Os painéis oficiais são usados no dia a dia, sem cobrança e sem planilhas paralelas.",
    idea: {
      1: "Usar o painel oficial nas reuniões no lugar das planilhas paralelas.",
      3: "Fazer os painéis chegarem até os gestores, sem depender de cobrança.",
    },
  },
  ia_automacao: {
    matters: "Rotinas manuais repetitivas consomem horas todo mês e cada etapa manual é uma chance de erro.",
    goal: "As tarefas repetitivas rodam sozinhas, com aviso quando algo falha.",
    idea: {
      1: "Escolher a tarefa manual que mais toma tempo e fazer o computador executá-la.",
      3: "Garantir que as automações avisem quando falharem.",
    },
  },
  ia_politica: {
    matters: "Sem regras, colaboradores colam dados de clientes, contratos e senhas em ferramentas de IA públicas — um risco de vazamento invisível.",
    goal: "Todos sabem o que pode e o que não pode ser feito com IA na empresa.",
    idea: {
      1: "Deixar claro, em uma página, o que pode e o que não pode ser usado com IA.",
      3: "Acompanhar os usos de IA na empresa e aprovar os que usam dados confiáveis.",
    },
  },
  ia_dados: {
    matters: "IA com dados ruins dá respostas erradas com aparência de certas — o investimento não volta e a confiança cai.",
    goal: "Os usos de IA apoiados em dados confiáveis e com resultado medido.",
    idea: {
      1: "Escolher um uso de IA que resolva uma dor real e já tenha dados disponíveis.",
      2: "Arrumar os dados desse uso antes de testar a IA.",
      3: "Testar a IA em pequena escala e comparar com o resultado sem ela.",
    },
  },
};

// ---------------------------------------------------------------------
// Checagens de área: roteiro por dimensão de qualidade
// ---------------------------------------------------------------------
const CHECK_PLAIN: Record<QualityDim, { matters: string; idea: string; target: string }> = {
  consistencia: { matters: "Quando dois relatórios mostram números diferentes para a mesma coisa, ninguém sabe em qual acreditar e a decisão trava.", idea: "Comparar os dois números em rotina e explicar cada diferença, até que eles batam.", target: "Os números das duas fontes batem todo mês — e, quando não batem, a diferença é conhecida e explicada." },
  validade: { matters: "Se cada um aplica a regra do seu jeito, o mesmo indicador muda conforme quem faz o relatório.", idea: "Combinar a regra por escrito e fazer todos os relatórios seguirem a mesma.", target: "Uma regra escrita, igual para todos os relatórios." },
  completude: { matters: "Informação que não é registrada não pode ser analisada: a empresa decide olhando só uma parte da realidade.", idea: "Registrar tudo no sistema oficial, sem controles paralelos, e medir o que falta.", target: "Tudo o que importa registrado no sistema, sem controles paralelos." },
  acuracidade: { matters: "Se o sistema não reflete a realidade, as decisões tomadas a partir dele também erram.", idea: "Conferir o sistema contra a realidade, por amostra, e corrigir na origem.", target: "O sistema reflete a realidade, conferido por amostragem em rotina." },
  unicidade: { matters: "Cadastros duplicados distorcem contagens e históricos (o mesmo cliente parece dois) e geram retrabalho.", idea: "Limpar os cadastros duplicados e impedir que novos apareçam.", target: "Cada cliente, item ou pessoa cadastrado uma única vez." },
  tempestividade: { matters: "Informação que chega tarde só serve para explicar o problema, não para evitá-lo.", idea: "Combinar quando a informação precisa chegar e garantir esse prazo.", target: "A informação chega no prazo combinado com quem decide." },
};

const CHECK_PLAYBOOK: Record<QualityDim, { how: string[]; deliverable: string; done: string; goals: GoalKey[]; weeks: number }> = {
  consistencia: { how: ["Pegue o último fechamento e coloque os dois números lado a lado.", "Liste cada diferença com a causa (regra, data, cadastro, integração).", "Transforme em rotina com responsável e tolerância definida."], deliverable: "Conciliação com as diferenças explicadas", done: "Duas rotinas seguidas dentro da tolerância, com causas registradas", goals: ["confianca", "visao"], weeks: 3 },
  validade: { how: ["Escreva a regra em uma frase, junto com o responsável da área.", "Aplique a regra nos relatórios existentes e registre no Glossário.", "Revise sempre que a regra mudar."], deliverable: "Regra escrita e registrada no Glossário", done: "Todos os relatórios usam a mesma regra", goals: ["confianca"], weeks: 2 },
  completude: { how: ["Liste o que precisa ser registrado e onde.", "Meça quanto falta hoje (% de registros completos).", "Torne o registro obrigatório e acompanhe o % toda semana."], deliverable: "Indicador de % de registros completos", done: "Mais de 95% dos registros completos por um mês", goals: ["visao", "confianca"], weeks: 3 },
  acuracidade: { how: ["Compare uma amostra do sistema com a realidade (contagem, documento, cliente).", "Corrija na origem e registre a causa de cada erro.", "Repita em rotina, começando pelos itens mais relevantes."], deliverable: "Amostragem periódica com registro de erros", done: "Duas amostragens seguidas sem erro relevante", goals: ["confianca"], weeks: 3 },
  unicidade: { how: ["Extraia o cadastro e procure duplicidades pelo documento ou código.", "Unifique os duplicados com o responsável da área.", "Bloqueie novas duplicidades na criação do cadastro."], deliverable: "Cadastro deduplicado + trava na criação", done: "Zero duplicidades novas em um mês", goals: ["confianca", "visao"], weeks: 3 },
  tempestividade: { how: ["Meça a defasagem atual: quando o dado chega × quando é usado.", "Combine o prazo aceitável com quem decide.", "Crie a rotina (ou automação) que cumpre o prazo e mostre a data de atualização."], deliverable: "Prazo de atualização definido e visível", done: "Um mês cumprindo o prazo combinado", goals: ["manual", "visao"], weeks: 3 },
};

// ---------------------------------------------------------------------
// Personalização
// ---------------------------------------------------------------------
const ERP = ["TOTVS", "SAP", "Sankhya", "Omie", "Bling", "Senior"];
const BI = ["Power BI", "Tableau", "Looker", "Metabase", "Qlik"];

function pick(ctx: AssessmentContext | undefined, list: string[], fallback: string) {
  const s = (ctx?.sistemas || []).find((x) => list.some((l) => x.toLowerCase().includes(l.toLowerCase())));
  return s || fallback;
}

function fill(text: string, ctx: AssessmentContext | undefined) {
  const sec = sectorOf(ctx?.segmento);
  const pessoas: Record<string, string> = {
    comercio: "clientes (consumidores), colaboradores e entregas",
    saude: "pacientes (dado sensível), colaboradores e profissionais",
    educacao: "alunos, responsáveis e colaboradores",
    logistica: "destinatários, motoristas e colaboradores",
    industria: "colaboradores, representantes e clientes pessoa física",
    servicos: "contatos de clientes, colaboradores e terceiros",
    outro: "clientes, colaboradores e terceiros",
  };
  const entidade: Record<string, string> = {
    comercio: "produtos",
    industria: "itens/produtos",
    servicos: "clientes",
    logistica: "clientes",
    saude: "pacientes",
    educacao: "alunos",
    outro: "clientes ou produtos",
  };
  return text
    .replace(/\{erp\}/g, pick(ctx, ERP, "o ERP"))
    .replace(/\{bi\}/g, pick(ctx, BI, "o BI"))
    .replace(/\{pessoas\}/g, pessoas[sec])
    .replace(/\{entidade\}/g, entidade[sec]);
}

const PAIN_PATTERNS: [GoalKey, RegExp][] = [
  ["confianca", /n[aã]o bat|diverg|diferen|confi|errad|inconsist|qual [eé] o certo/i],
  ["manual", /manual|demor|planilha|retrabalho|horas|dias para|copiar|colar/i],
  ["visao", /integr|cruz|junt|vis[aã]o|consolid|espalhad|silo/i],
  ["risco", /lgpd|vazam|acesso|senha|seguran|depend|sa[ií]da de|s[oó] (uma|ele|ela)|backup/i],
  ["crescer", /\bia\b|intelig[eê]ncia|cresc|escala|previs/i],
];

function painGoals(dores?: string): Set<GoalKey> {
  const out = new Set<GoalKey>();
  if (!dores) return out;
  for (const [g, re] of PAIN_PATTERNS) if (re.test(dores)) out.add(g);
  return out;
}

function ownerLabel(key: OwnerKey, ctx: AssessmentContext | undefined, area?: string): string {
  const team = ctx?.time_dados;
  switch (key) {
    case "diretoria":
      return "Diretoria";
    case "gestor":
      return "Gestor da área";
    case "ti":
      return "TI ou fornecedor do sistema";
    case "juridico":
      return "Jurídico / responsável pela LGPD";
    case "area":
      return area ? `Responsável por ${area}` : "Gestor da área";
    case "dados":
      if (team === "ninguem" || team === "acumula" || !team) return "Quem produz os relatórios hoje";
      if (team === "externo") return "Consultoria de dados + um gestor interno";
      return "Responsável de dados/BI";
  }
}

function capacityFor(ctx: AssessmentContext | undefined): { n: number; note: string } {
  switch (ctx?.time_dados) {
    case "ninguem":
      return { n: 3, note: "Sem ninguém dedicado a dados, o plano começa com 3 passos de baixo esforço, conduzidos por gestores." };
    case "acumula":
      return { n: 3, note: "Como os dados são uma função acumulada, a Onda 1 tem 3 passos para caber na rotina." };
    case "um":
      return { n: 4, note: "Com uma pessoa dedicada, a Onda 1 tem até 4 passos." };
    case "externo":
      return { n: 4, note: "Com apoio externo, a Onda 1 tem até 4 passos — cada um precisa de um gestor interno como dono." };
    case "time":
      return { n: 5, note: "Com um time de dados, a Onda 1 tem até 5 passos em paralelo." };
    default:
      return { n: 4, note: "Informe no contexto quem cuida de dados para calibrar o tamanho do plano." };
  }
}

// ---------------------------------------------------------------------
// Perfil: a situação da empresa em uma frase
// ---------------------------------------------------------------------
export function profileFor(a: Pick<Assessment, "answers">, s: ScoreResult): Profile {
  const d = Object.fromEntries(s.dims.map((x) => [x.dim.key, x.score ?? 0])) as Record<string, number>;
  const ans = a.answers || {};
  const low = (id: string, n: number) => typeof ans[id] === "number" && ans[id] > 0 && ans[id] <= n;
  const overall = s.overall ?? 0;

  if (overall >= 60 && !s.gates.length)
    return { key: "escala", title: "Pronta para escalar", summary: "Os fundamentos estão no lugar: fontes conhecidas, responsáveis definidos e qualidade conferida.", focus: "Automatizar com monitoramento, fixar metas de qualidade e testar casos de IA sobre dados governados." };
  const usesData = (ans.est_uso ?? 0) >= 3 || d.estrategia >= 45;
  if (usesData && (d.qualidade < 45 || d.governanca < 40))
    return { key: "desconfianca", title: "Muitos números, pouca confiança", summary: "A gestão quer decidir com dados, mas os números são contestados e conferidos à mão.", focus: "Definição escrita, responsável por dado e conferência de qualidade — antes de novos painéis." };
  if (overall < 25 || (d.estrategia < 35 && d.fontes < 35))
    return { key: "escuro", title: "Operando no escuro", summary: "Os números existem, mas espalhados e pouco usados nas decisões.", focus: "Escolher poucos indicadores, dizer de onde vêm e quem responde por eles — antes de qualquer ferramenta." };
  if ((low("pes_dependencia", 2) || low("int_consol", 2)) && d.ia < 45)
    return { key: "refem", title: "Refém de pessoas e planilhas", summary: "Os relatórios saem, mas à custa de trabalho manual e do conhecimento de poucas pessoas.", focus: "Documentar e padronizar o que já funciona; depois automatizar a rotina mais cara." };
  if (d.seguranca < 35)
    return { key: "exposta", title: "Exposta a riscos", summary: "Os dados circulam, mas acessos, dados pessoais e cópias de segurança não estão sob controle.", focus: "Reduzir o risco (acessos, LGPD, backup) antes de ampliar integrações e acessos." };
  if (d.fontes >= 55 && d.integracao >= 50 && (d.estrategia < 50 || d.pessoas < 45))
    return { key: "subutilizada", title: "Estrutura pronta, pouco uso", summary: "A base técnica está razoável, mas os dados ainda não viraram hábito de gestão.", focus: "Ritual de indicadores, leitura dos números pelos gestores e medição do resultado das decisões." };
  return { key: "estruturando", title: "Em estruturação", summary: "Há rotinas em construção em várias frentes, com fundamentos ainda incompletos.", focus: "Fechar os fundamentos que limitam o nível: responsáveis, fontes oficiais e conferência de qualidade." };
}

// ---------------------------------------------------------------------
// Montagem do plano
// ---------------------------------------------------------------------
const GATE_SENTENCE = "Este ponto hoje segura o nível geral da empresa: enquanto ele não avançar, a nota não passa de 'Definido' (3 de 5), mesmo que o resto melhore.";

function evidenceNote(ev?: string) {
  return ev ? ` Registro do diagnóstico: “${clip(ev, 160).replace(/[.;:,]+$/, "")}”.` : "";
}

function clip(t: string, n: number) {
  const x = t.replace(/\s+/g, " ").trim();
  return x.length > n ? `${x.slice(0, n - 1).trimEnd()}…` : x;
}

/** Monta a narrativa do passo: onde estamos → por que importa → aonde chegar → o passo. */
function story(now: string, matters: string, target: string, idea: string, signals: string[], today = "") {
  return { now, today, matters, target, idea, signals: [...signals], why: [now, matters, ...signals].filter(Boolean).join(" ") };
}
const FOUNDATION_DIMS = new Set(["governanca", "integracao", "fontes", "qualidade"]);

export function buildRoadmap(a: Pick<Assessment, "answers" | "context"> & Partial<Pick<Assessment, "evidence">>, score: ScoreResult): Roadmap {
  const ctx = a.context || {};
  const answers = a.answers || {};
  const gateIds = new Set(score.gates.map((g) => g.questionId));
  const goal = ctx.objetivo as GoalKey | undefined;
  const goalLabel = GOALS.find((g) => g.key === goal)?.label;
  const pains = painGoals(ctx.dores);
  const steps: PlanStep[] = [];

  // O primeiro objetivo de cada passo é o principal: só ele gera selo, para o selo continuar significativo.
  const personalize = (goals: GoalKey[], base: number, tags: string[], why: string[]) => {
    let p = base;
    const main = goals[0];
    if (goal && main === goal) {
      p *= 1.35;
      tags.push("Seu objetivo");
      why.push(`Vai direto ao objetivo que vocês escolheram: ${goalLabel?.toLowerCase()}.`);
    } else if (goal && goals.includes(goal)) p *= 1.1;
    if (main && pains.has(main) && main !== goal) {
      p *= 1.2;
      tags.push("Responde à sua dor");
      why.push(ctx.dores ? `Responde a uma dificuldade que vocês relataram: “${clip(ctx.dores, 120)}”.` : "Responde a uma dificuldade que vocês relataram.");
    }
    return p;
  };

  // Perguntas de capacidade
  for (const dim of DIMENSIONS)
    for (const q of dim.questions) {
      const v = answers[q.id];
      if (v === undefined || v === NOT_APPLICABLE) continue;
      const lib = Q[q.id];
      if (!lib) continue;
      const s = questionScore(q, v);
      if (s === null || s >= 100) continue;
      const isGate = gateIds.has(q.id);
      const tags: string[] = [];
      const why: string[] = [];
      if (isGate) tags.push("Limita o nível");

      if (v === UNKNOWN) {
        // Ponto cego: o primeiro passo é descobrir.
        const p = personalize(lib[1].goals, (isGate ? 2 : 1.1) * dim.weight, tags, why);
        steps.push({
          id: q.id,
          kind: "discovery",
          title: `Descobrir ${lib.topic}`,
          ...story(
            `Na pergunta “${q.prompt}”, a resposta foi “Não sei”. É um ponto cego: hoje a empresa não sabe como está neste tema.`,
            PLAIN[q.id]?.matters ?? "",
            "Saber com clareza como a empresa está neste tema, com uma evidência — para escolher o passo certo.",
            "Antes de mudar qualquer coisa, descobrir como o tema funciona hoje.",
            isGate ? [GATE_SENTENCE, ...why] : why,
            "Ninguém soube responder no diagnóstico",
          ),
          how: [
            `Pergunte a quem opera o assunto no dia a dia: ${lib.topic}.`,
            "Peça uma evidência (relatório, print, planilha, quem faz e com que frequência).",
            "Volte ao diagnóstico, atualize a resposta e registre a evidência.",
          ],
          deliverable: "Resposta atualizada no diagnóstico, com evidência",
          owner: ownerLabel(lib[1].owner, ctx),
          effort: "baixo",
          weeks: 1,
          done: "A pergunta tem resposta e evidência",
          wave: isGate || FOUNDATION_DIMS.has(dim.key) ? 1 : 2,
          priority: p,
          origin: `${dim.code} · ${dim.title}`,
          tags: [...tags, "Ponto cego"],
          reason: "Resposta 'Não sei' — ponto cego",
        });
        continue;
      }

      const level = Math.min(3, Math.max(1, v)) as 1 | 2 | 3;
      const def = (level === 2 ? lib[2] ?? lib[1] : lib[level]) as StepDef;
      const cur = answerLabel(q.levels, v);
      const next = q.levels.find((l) => l.v === v + 1)?.label;
      if (isGate) why.unshift(GATE_SENTENCE);
      const ev = (a.evidence || {})[q.id]?.trim();

      const gap = (100 - s) / 100;
      const base = gap * dim.weight * (isGate ? 2 : 1) * (FOUNDATION_DIMS.has(dim.key) ? 1.3 : 1);
      const p = personalize(def.goals, base, tags, why);
      const wave: 1 | 2 | 3 = isGate || (FOUNDATION_DIMS.has(dim.key) && s < 40) ? 1 : s < 40 ? 2 : 3;
      steps.push({
        id: q.id,
        kind: "question",
        title: fill(def.title, ctx),
        ...story(
          `Na pergunta “${q.prompt}”, a resposta foi: “${cur}”.${evidenceNote(ev)}`,
          PLAIN[q.id]?.matters ?? "",
          PLAIN[q.id]?.goal ?? (next ? `“${next}”.` : "Manter o nível alcançado."),
          fill(PLAIN[q.id]?.idea[level === 2 && !PLAIN[q.id]?.idea[2] ? 1 : level] ?? "", ctx),
          why,
          cur ?? "",
        ),
        how: def.how.map((h) => fill(h, ctx)),
        deliverable: fill(def.deliverable, ctx),
        owner: ownerLabel(def.owner, ctx),
        effort: def.effort,
        weeks: def.weeks,
        done: def.done,
        wave,
        priority: p,
        origin: `${dim.code} · ${dim.title}`,
        tags,
        reason: isGate ? "Limita o nível geral" : `Score ${Math.round(s)}%`,
        tool: def.tool,
      });
    }

  // Checagens das áreas avaliadas
  for (const d of scopedDomains(a))
    for (const c of d.checks) {
      const v = answers[c.id];
      if (v === undefined || v === NOT_APPLICABLE) continue;
      const s = checkScore(v);
      if (s === null || s >= 100) continue;
      const pb = CHECK_PLAYBOOK[c.quality];
      const tags: string[] = c.critical ? ["Crítico"] : [];
      const why: string[] = [];
      if (c.critical) why.push(`É um ponto crítico de ${d.title.toLowerCase()}: um erro aqui contamina os principais indicadores da área.`);
      const ev = (a.evidence || {})[c.id]?.trim();
      const answerTxt = v === UNKNOWN ? "“Não sei” — ninguém soube dizer" : v === 1 ? "“Não”" : "“Em parte / às vezes”";
      const cp = CHECK_PLAIN[c.quality];
      const gap = (100 - s) / 100;
      const p = personalize(pb.goals, gap * (c.critical ? 1.6 : 1), tags, why);
      const wave: 1 | 2 | 3 = c.critical && s < 50 ? 1 : s < 50 ? 2 : 3;
      steps.push({
        id: c.id,
        kind: "check",
        title: c.action.replace(/\.$/, ""),
        ...story(
          `Em ${d.title}, perguntamos: “${c.prompt}” A resposta foi ${answerTxt}.${evidenceNote(ev)}`,
          cp.matters,
          cp.target,
          cp.idea,
          why,
          v === UNKNOWN ? "Ninguém soube responder no diagnóstico" : v === 1 ? "Não existe" : "Existe só em parte",
        ),
        how: v === UNKNOWN ? ["Pergunte ao responsável da área se esse controle existe e como é feito.", ...pb.how.slice(1)] : pb.how,
        deliverable: pb.deliverable,
        owner: ownerLabel("area", ctx, d.title),
        effort: c.critical ? "medio" : "baixo",
        weeks: pb.weeks,
        done: pb.done,
        wave,
        priority: p,
        origin: d.title,
        tags: v === UNKNOWN ? [...tags, "Ponto cego"] : tags,
        reason: v === UNKNOWN ? "Ninguém soube responder" : c.critical ? "Ponto crítico de consistência" : "Controle parcial",
      });
    }

  // Ordena e aplica a capacidade da equipe à Onda 1.
  steps.sort((x, y) => x.wave - y.wave || y.priority - x.priority);
  const cap = capacityFor(ctx);
  let inWave1 = 0;
  for (const st of steps)
    if (st.wave === 1) {
      inWave1++;
      // Passo que limita o nível nunca sai da Onda 1.
      if (inWave1 > cap.n && !st.tags.includes("Limita o nível")) st.wave = 2;
    }
  steps.sort((x, y) => x.wave - y.wave || y.priority - x.priority);

  return { profile: profileFor(a, score), steps, capacity: cap.n, capacityNote: cap.note };
}

