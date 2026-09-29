// Conteúdo da metodologia (base: Manual de Data Governance v0.2).
// Usado na página Metodologia e no guia em PDF (scripts/build-guide.ts).

export const WHY = {
  title: "Por que medir a maturidade de dados",
  paragraphs: [
    "Empresas de médio porte compartilham um padrão: dados espalhados em sistemas diferentes (ERP, e-commerce, armazém, planilhas), sem dono formal, sem uma chave comum para cruzar informações e sem rotina de conferência.",
    "O resultado é conhecido: números que não batem, relatórios que levam dias, decisões tomadas por experiência. O risco maior não é a falta de dashboard — é consolidar métricas erradas de forma bonita, o que gera confiança falsa.",
    "O diagnóstico mostra onde a empresa está, o que impede o próximo passo e por onde começar — com ações que geram valor visível em semanas, não em anos.",
  ],
};

export const STEPS = [
  { n: 1, title: "Contexto", text: "Escopo, quem responde, sistemas em uso, principais dificuldades e áreas que entram no diagnóstico." },
  { n: 2, title: "Perguntas", text: "8 capacidades de gestão de dados e 4 a 5 pontos de conferência por área. Responda sozinho ou conversando com o assistente." },
  { n: 3, title: "Revisão", text: "Regras automáticas e o assistente apontam respostas contraditórias e pontos cegos antes de fechar o nível." },
  { n: 4, title: "Relatório e plano", text: "Nível de 1 a 5, leitura executiva, mapa de qualidade por área e plano de ação em ondas de 30, 60 e 90 dias." },
];

export const PRINCIPLES = [
  { title: "Evidência acima de opinião", text: "Toda resposta pode ter uma evidência (um relatório, uma conferência, quem faz e com que frequência). Autoavaliação tende a ser otimista." },
  { title: "“Não sei” é um achado", text: "Desconhecer como o próprio dado funciona pontua zero e vira ponto a investigar — é informação valiosa, não falha do respondente." },
  { title: "Não se pula etapa", text: "Sem dono, sem chave mestra ou sem nenhuma conferência de qualidade, o nível não passa de 3 — mesmo que a média seja maior." },
  { title: "Valor rápido, evolução incremental", text: "Cada recomendação é o menor passo que gera resultado visível. Automação e IA vêm depois das fundações." },
];

export const QUALITY_EXPLAINED = [
  { key: "acuracidade", label: "Acuracidade", text: "O dado reflete a realidade?", example: "O saldo de estoque do sistema bate com a contagem física." },
  { key: "completude", label: "Completude", text: "Faltam registros ou campos?", example: "Todos os pedidos têm data de entrega registrada, não só os reclamados." },
  { key: "consistencia", label: "Consistência", text: "O mesmo número bate em fontes diferentes?", example: "O faturamento do e-commerce é igual ao faturado no ERP." },
  { key: "tempestividade", label: "Tempestividade", text: "O dado chega a tempo de decidir?", example: "A posição de estoque usada na reposição tem no máximo 24h." },
  { key: "unicidade", label: "Unicidade", text: "Cada item existe uma única vez?", example: "O mesmo cliente não aparece com dois códigos diferentes." },
  { key: "validade", label: "Validade", text: "O dado segue a regra definida?", example: "Devoluções são tratadas da mesma forma em todos os relatórios." },
];

export const CONCEPTS: { term: string; def: string; group: "Papéis" | "Arquitetura" | "Qualidade e governança" }[] = [
  { group: "Papéis", term: "Data Owner", def: "Autoridade de negócio sobre um domínio de dados (ex.: gerente comercial para vendas). Aprova definições e premissas e prioriza demandas. Sem owner, o número pode estar tecnicamente certo, mas ninguém confia nele para decidir." },
  { group: "Papéis", term: "Data Steward", def: "Responsável pela execução: carrega, consolida e faz a primeira conferência de qualidade. Normalmente um analista sênior da área." },
  { group: "Papéis", term: "Data User", def: "Quem consome o dado consolidado para decidir, sem responsabilidade de manutenção." },
  { group: "Arquitetura", term: "Chave mestra (tabela de-para)", def: "Código que conecta a mesma coisa entre sistemas: o cliente, o produto ou serviço, o fornecedor, o colaborador. O problema raramente é o código em si, e sim a falta de uma tabela única que traduza os códigos de cada sistema." },
  { group: "Arquitetura", term: "Silo de dados", def: "Fonte isolada que não conversa com o resto da empresa. Surge naturalmente quando cada área resolve seus problemas com as ferramentas que tem — deve ser mapeado antes de ser eliminado." },
  { group: "Arquitetura", term: "Camadas bronze, prata e ouro", def: "Bronze: dado bruto, como veio da fonte. Prata: dado limpo, sem duplicidade e com a chave comum aplicada. Ouro: indicadores prontos para consumo em relatórios e painéis." },
  { group: "Arquitetura", term: "Fonte única da verdade", def: "Um lugar oficial para cada informação, que elimina a pergunta “qual planilha está certa?”. Exige também regra clara de quem pode alterá-la." },
  { group: "Arquitetura", term: "Maturidade de pipeline (N1 a N5)", def: "N1 script exploratório → N2 rotina com responsável → N3 banco consolidado alimentando BI → N4 automação monitorada → N5 consultas em linguagem natural. Não se automatiza antes de validar as premissas manualmente." },
  { group: "Qualidade e governança", term: "Metadados", def: "Informação sobre o dado: o que significa, de onde vem, quem é o dono, com que frequência atualiza. É o que permite que alguém novo entenda um indicador meses depois." },
  { group: "Qualidade e governança", term: "Glossário de KPIs", def: "Uma ficha por indicador: definição, fórmula, premissas, exclusões, owner e de quais tabelas vem. Acaba com versões diferentes do mesmo número." },
  { group: "Qualidade e governança", term: "Linhagem", def: "O caminho do dado: de onde vem, como é transformado e onde é usado. Essencial para explicar e corrigir um número." },
  { group: "Qualidade e governança", term: "LGPD e sensibilidade", def: "Classificar cada fonte (público interno, restrito, confidencial, dado pessoal) e dar acesso proporcional ao risco. Credenciais ficam em cofre de senhas — nunca em planilha ou e-mail." },
];

export const WAVES_DETAIL = [
  { wave: "Onda 1 · 0–30 dias", focus: "Fundamentos", items: ["Nomear o responsável de negócio de cada área de dados", "Declarar a fonte oficial de cada informação importante", "Criar a tabela de correspondência de códigos entre sistemas", "Começar as conferências de qualidade e tratar riscos críticos (acessos, LGPD)"] },
  { wave: "Onda 2 · 30–60 dias", focus: "Estrutura", items: ["Escrever a definição dos indicadores principais (Glossário)", "Centralizar os dados numa base única", "Corrigir erros na origem e registrar as causas"] },
  { wave: "Onda 3 · 60–90 dias", focus: "Escala", items: ["Automatizar as rotinas mais repetitivas, com aviso de falha", "Levar os painéis para os rituais de gestão e formar os gestores", "Publicar regras de uso de IA e testar um caso com dados governados"] },
];

export const SUCCESS = [
  "Todas as fontes da área prioritária mapeadas, com a dificuldade de acesso registrada.",
  "100% dos domínios críticos com owner e steward nomeados — mesmo que informalmente no início.",
  "Dado consolidado atualizado por rotina, sem depender de alguém “lembrar” de rodar.",
  "Uso espontâneo do painel pelo time, sem cobrança constante.",
];

export const REFERENCES = [
  { name: "DAMA-DMBOK", text: "Referência mais abrangente de gestão de dados; dá o vocabulário comum e garante que nenhuma dimensão fique de fora." },
  { name: "DGI", text: "Foco em direitos de decisão: quem decide sobre qual dado. Base dos papéis de owner e steward." },
  { name: "DCAM", text: "Modelo de avaliação de maturidade por níveis, sem pular etapas. Base dos requisitos fundamentais." },
  { name: "NIST", text: "Referência em risco e conformidade: acesso, proteção de dados sensíveis e aderência à LGPD." },
  { name: "DCAM v3 (2025)", text: "Atualização do DCAM com foco em IA, privacidade e financiamento das iniciativas de dados — base das perguntas sobre orçamento e regras de uso de IA." },
  { name: "Data Orchard / UK DMA", text: "Modelos que tratam liderança, cultura e habilidades como parte da maturidade, e escrevem cada nível como comportamento observável — base das perguntas de letramento e dos níveis do questionário." },
  { name: "DAMA UK — 6 dimensões", text: "Acuracidade, completude, consistência, tempestividade, unicidade e validade: a régua usada nas checagens de cada área." },
];
