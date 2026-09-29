// Gera docs/guia/guia.html — guia de uso + metodologia, pronto para virar PDF.
// Uso: node --experimental-strip-types scripts/build-guide.ts
// Depois: abra o HTML no Chrome → Imprimir → Salvar como PDF (A4, com gráficos de fundo),
// ou use o script de renderização descrito em docs/guia/README.md.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BANDS, DIMENSIONS, DOMAINS } from "../src/model/framework.ts";
import { CONCEPTS, PRINCIPLES, QUALITY_EXPLAINED, REFERENCES, STEPS, SUCCESS, WAVES_DETAIL, WHY } from "../src/model/concepts.ts";

const ROOT = join(import.meta.dirname, "..");
const IMG = join(ROOT, "docs/guia/img");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const img = (name: string, caption: string) => {
  const f = join(IMG, `${name}.jpg`);
  if (!existsSync(f)) return "";
  const b64 = readFileSync(f).toString("base64");
  return `<figure><img src="data:image/jpeg;base64,${b64}" alt="${esc(caption)}"/><figcaption>${esc(caption)}</figcaption></figure>`;
};
const today = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const gates = DIMENSIONS.flatMap((d) => d.questions.filter((q) => q.gate).map((q) => q.gate!.reason));

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Moulis · Guia do Diagnóstico de Maturidade de Dados</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet"/>
<style>
@page { size: A4; margin: 18mm 17mm 20mm; }
@page :first { margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, system-ui, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #1b1b1b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3, .display { font-family: "Plus Jakarta Sans", Inter, sans-serif; letter-spacing: -0.02em; color: #111; }
h1 { font-size: 26pt; line-height: 1.1; margin: 0 0 6mm; }
h2 { font-size: 16pt; margin: 9mm 0 3mm; }
h3 { font-size: 11.5pt; margin: 6mm 0 2mm; }
p { margin: 0 0 3mm; }
.muted { color: #6e6e6b; }
.small { font-size: 9.5pt; }
.eyebrow { font-size: 8pt; letter-spacing: 0.16em; text-transform: uppercase; color: #6e6e6b; font-weight: 600; margin: 0 0 3mm; }
.page { break-before: page; }
.flow { margin-top: 10mm; }
.flow > h1:first-child { font-size: 20pt; }
.avoid { break-inside: avoid; }

/* capa */
.cover { height: 297mm; background: #0b0b0b; color: #fff; padding: 26mm 22mm; display: flex; flex-direction: column; justify-content: space-between; }
.cover .brand { display: flex; align-items: center; gap: 10px; font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 18pt; }
.cover .mark { width: 34px; height: 34px; border-radius: 8px; background: #fff; display: grid; place-items: center; }
.cover h1 { color: #fff; font-size: 38pt; max-width: 150mm; margin-bottom: 8mm; }
.cover p { color: #b5b5b0; font-size: 13pt; max-width: 130mm; }
.cover .scale { display: flex; gap: 3mm; margin-top: 14mm; }
.cover .scale span { flex: 1; height: 5px; border-radius: 3px; }
.cover .foot { color: #7d7d78; font-size: 9pt; display: flex; justify-content: space-between; }

/* sumário */
.toc ol { padding-left: 0; list-style: none; counter-reset: t; }
.toc li { counter-increment: t; display: flex; gap: 4mm; padding: 2.4mm 0; border-bottom: 1px solid #e7e7e3; }
.toc li::before { content: counter(t, decimal-leading-zero); color: #9a9a95; font-variant-numeric: tabular-nums; width: 8mm; }
.part { font-size: 8pt; letter-spacing: 0.16em; text-transform: uppercase; color: #111; font-weight: 700; margin: 6mm 0 1mm; }

/* blocos */
.lead { font-size: 12pt; color: #3b3b3b; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
.box { border: 1px solid #e3e3df; border-radius: 3mm; padding: 4mm 4.5mm; }
.box b, .t { font-weight: 600; color: #111; }
.num { display: inline-grid; place-items: center; width: 7mm; height: 7mm; border-radius: 50%; background: #111; color: #fff; font-weight: 600; font-size: 9pt; margin-bottom: 2mm; }
.levels { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid #e3e3df; border-radius: 3mm; overflow: hidden; }
.levels div { padding: 4mm; border-left: 1px solid #e3e3df; }
.levels div:first-child { border-left: 0; }
.levels .n { font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 22pt; line-height: 1; }
.levels .l { font-weight: 600; margin: 2mm 0 1mm; }
.levels p { font-size: 8.8pt; color: #555; margin: 0; }
table { width: 100%; border-collapse: collapse; font-size: 9.3pt; }
th { text-align: left; font-weight: 600; color: #6e6e6b; font-size: 8pt; letter-spacing: 0.06em; text-transform: uppercase; padding: 2mm 2mm; border-bottom: 1.5px solid #111; }
td { padding: 2.3mm 2mm; border-bottom: 1px solid #e7e7e3; vertical-align: top; }
.cap { break-inside: avoid; border-top: 1px solid #e3e3df; padding: 4mm 0 3mm; }
.cap h3 { margin: 0 0 1mm; }
.cap ol { margin: 2mm 0 0; padding-left: 5mm; font-size: 9.5pt; }
.concept { break-inside: avoid; padding: 3mm 0; border-top: 1px solid #e7e7e3; }
.callout { border-left: 3px solid #111; background: #f4f4f2; padding: 3.5mm 4.5mm; border-radius: 0 2mm 2mm 0; margin: 4mm 0; }
figure { margin: 4mm 0 6mm; break-inside: avoid; }
figure img { max-width: 100%; max-height: 92mm; width: auto; margin: 0 auto; border: 1px solid #e3e3df; border-radius: 2.5mm; display: block; }
figcaption { text-align: center; }
h1, h2, h3, .eyebrow, .part { break-after: avoid; }
figcaption { font-size: 8.5pt; color: #6e6e6b; margin-top: 1.5mm; }
.steplist { counter-reset: s; list-style: none; padding: 0; margin: 0; }
.steplist li { counter-increment: s; display: grid; grid-template-columns: 8mm 1fr; gap: 2mm; margin-bottom: 2mm; }
.steplist li::before { content: counter(s); width: 5.5mm; height: 5.5mm; border-radius: 50%; background: #efefec; font-size: 8pt; font-weight: 600; display: grid; place-items: center; margin-top: 0.5mm; }
.tag { display: inline-block; font-size: 8pt; border-radius: 99px; padding: 0.5mm 2.5mm; background: #efefec; }
</style></head><body>

<section class="cover">
  <div class="brand"><span class="mark"><svg width="20" height="20" viewBox="0 0 32 32"><path d="M7 24V8l9 10 9-10v16" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>moulis</div>
  <div>
    <p class="eyebrow" style="color:#8a8a86">Guia de uso e metodologia</p>
    <h1>Diagnóstico de Maturidade de Dados</h1>
    <p>Como a ferramenta funciona, o método por trás do resultado e os conceitos essenciais para conduzir o diagnóstico com os clientes.</p>
    <div class="scale">${BANDS.map((b) => `<span style="background:${b.color}"></span>`).join("")}</div>
  </div>
  <div class="foot"><span>Moulis Consultoria</span><span>${today}</span></div>
</section>

<section class="page toc">
  <p class="eyebrow">Conteúdo</p>
  <h1>Sumário</h1>
  <div class="part">Parte 1 · Metodologia</div>
  <ol>
    <li>Por que medir a maturidade de dados</li><li>Como o diagnóstico funciona</li><li>Os 5 níveis de maturidade</li>
    <li>Como o resultado é calculado</li><li>As 8 capacidades avaliadas</li><li>Qualidade dos dados por área</li>
    <li>Conceitos essenciais</li><li>Próximos passos e critérios de sucesso</li>
  </ol>
  <div class="part">Parte 2 · Como usar a ferramenta</div>
  <ol style="counter-reset:t 8">
    <li>Acesso e perfis</li><li>Passo a passo do diagnóstico</li><li>O relatório</li><li>Glossário de KPIs</li>
    <li>Painel de clientes (equipe Moulis)</li><li>O assistente</li><li>Como conduzir uma sessão com o cliente</li><li>Perguntas frequentes</li>
  </ol>
</section>

<section class="page">
  <p class="eyebrow">Parte 1 · Metodologia</p>
  <h1>${esc(WHY.title)}</h1>
  ${WHY.paragraphs.map((p, i) => `<p class="${i === 0 ? "lead" : ""}">${esc(p)}</p>`).join("")}
  <div class="callout avoid"><b>Premissa de desenho.</b> Os frameworks de mercado (DAMA-DMBOK, DGI, DCAM, NIST) foram pensados para grandes organizações. Aqui eles são adaptados à realidade de empresas com times de dados de uma ou duas pessoas, onde cada passo precisa gerar valor visível rapidamente.</div>

  <h2>Como o diagnóstico funciona</h2>
  <div class="grid4">${STEPS.map((s) => `<div class="box avoid"><span class="num">${s.n}</span><div class="t">${esc(s.title)}</div><p class="small muted">${esc(s.text)}</p></div>`).join("")}</div>
</section>

<section class="page">
  <h2 style="margin-top:0">Princípios</h2>
  <div class="grid2">${PRINCIPLES.map((p) => `<div class="box avoid"><div class="t">${esc(p.title)}</div><p class="small muted" style="margin:1mm 0 0">${esc(p.text)}</p></div>`).join("")}</div>
  <h2>Os 5 níveis de maturidade</h2>
  <div class="levels avoid">${BANDS.map((b) => `<div><div class="n" style="color:${b.color}">${b.level}</div><div class="l">${b.label}</div><div class="small muted" style="margin-bottom:1.5mm">${b.min}–${Math.min(100, b.max)} pontos</div><p>${esc(b.summary)}</p></div>`).join("")}</div>

  <h2>Como o resultado é calculado</h2>
  <div class="grid2">
    <div class="box avoid"><div class="t">Score</div>
      <ul class="small" style="padding-left:4.5mm;margin:2mm 0 0">
        <li>Cada resposta vira uma nota de 0 a 100 conforme a opção escolhida.</li>
        <li>“Não sei” vale 0 e aparece no relatório como ponto a investigar.</li>
        <li><b>Score geral = 60% capacidades + 40% qualidade dos dados por área.</b></li>
        <li>Qualidade, integração e governança têm peso maior porque sustentam o resto.</li>
        <li>A confiabilidade do diagnóstico sobe com cobertura completa e evidências.</li>
      </ul>
    </div>
    <div class="box avoid"><div class="t">Requisitos fundamentais</div>
      <p class="small muted" style="margin:1mm 0 2mm">Enquanto faltar qualquer um, o nível fica limitado a 3 — não se pula etapa (lógica do DCAM):</p>
      <ul class="small" style="padding-left:4.5mm;margin:0">${gates.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
    </div>
  </div>
  <div class="callout avoid"><b>Revisão de consistência.</b> Antes de fechar o nível, regras automáticas cruzam as respostas (ex.: “confiança alta nos números” com “consolidação manual e sem conferência”) e o assistente faz uma leitura crítica, apontando o que confirmar com o time.</div>
</section>

<section class="page">
  <h2 style="margin-top:0">As 8 capacidades avaliadas</h2>
  <p class="muted">Cada capacidade tem 3 perguntas objetivas, com opções que descrevem situações reais — do estágio mais básico ao mais maduro.</p>
  ${DIMENSIONS.map((d, i) => `<div class="cap"><h3>${i + 1}. ${esc(d.title)}</h3><div class="small muted">${esc(d.description)} <span class="tag">${esc(d.refs)}</span></div><ol>${d.questions.map((q) => `<li>${esc(q.prompt)}${q.gate ? ' <span class="tag">fundamental</span>' : ""}</li>`).join("")}</ol></div>`).join("")}
</section>

<section class="page">
  <h2 style="margin-top:0">Qualidade dos dados por área</h2>
  <p>Além das capacidades, o diagnóstico verifica se os dados de cada área da operação conferem na prática. Cada ponto de conferência pertence a uma das seis dimensões de qualidade:</p>
  <table class="avoid"><thead><tr><th style="width:24%">Dimensão</th><th style="width:34%">Pergunta-chave</th><th>Exemplo</th></tr></thead>
  <tbody>${QUALITY_EXPLAINED.map((q) => `<tr><td><b>${q.label}</b></td><td>${esc(q.text)}</td><td class="muted">${esc(q.example)}</td></tr>`).join("")}</tbody></table>
  <h3>Áreas que podem ser avaliadas</h3>
  <table><thead><tr><th style="width:28%">Área</th><th>Exemplos de pontos de conferência</th></tr></thead>
  <tbody>${DOMAINS.map((d) => `<tr class="avoid"><td><b>${esc(d.title)}</b><div class="small muted">${esc(d.description)}</div></td><td class="small">${d.checks.slice(0, 3).map((c) => esc(c.prompt)).join("<br/>")}</td></tr>`).join("")}</tbody></table>
</section>

<section class="page">
  <h2 style="margin-top:0">Conceitos essenciais</h2>
  <p class="muted">O vocabulário mínimo para conversar sobre dados com qualquer área da empresa (extraído do Manual de Data Governance).</p>
  ${(["Papéis", "Arquitetura", "Qualidade e governança"] as const).map((g) => `<p class="eyebrow" style="margin-top:5mm">${g}</p>${CONCEPTS.filter((c) => c.group === g).map((c) => `<div class="concept"><b>${esc(c.term)}</b><div class="small" style="color:#3b3b3b;margin-top:1mm">${esc(c.def)}</div></div>`).join("")}`).join("")}
  <div class="callout avoid"><b>Apontamento de campo.</b> A governança costuma emperrar mais pela falta de <b>owner</b> do que de steward. E o gargalo de projetos de dados raramente é analítico: é de <b>acesso</b> — credenciais que ninguém sabe onde estão e dependência de fornecedores.</div>
</section>

<section class="page">
  <h2 style="margin-top:0">Próximos passos e critérios de sucesso</h2>
  <p>O relatório começa com o <b>perfil da empresa</b> — a situação em uma frase e o foco — e entrega os próximos passos em três ondas. Cada resposta abaixo do ideal gera o passo que leva ao próximo nível daquela pergunta, com como fazer, entregável, quem conduz, prazo típico e critério de pronto. A Onda 1 cabe na capacidade do time informada no contexto e começa pelo que limita o nível. A ordem importa: responsável → fonte oficial → código comum entre sistemas → qualidade → automação → IA.</p>
  <div class="grid3">${WAVES_DETAIL.map((w) => `<div class="box avoid"><div class="t">${esc(w.wave)}</div><div class="small muted" style="margin-bottom:2mm">${esc(w.focus)}</div><ul class="small" style="padding-left:4.5mm;margin:0">${w.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}</div>
  <h3>Como saber que deu certo</h3>
  <ul>${SUCCESS.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
  <h3>Referências</h3>
  <table><tbody>${REFERENCES.map((r) => `<tr><td style="width:22%"><b>${r.name}</b></td><td class="muted">${esc(r.text)}</td></tr>`).join("")}</tbody></table>
</section>

<section class="page">
  <p class="eyebrow">Parte 2 · Como usar a ferramenta</p>
  <h1>Acesso e perfis</h1>
  <table class="avoid"><thead><tr><th style="width:24%">Perfil</th><th>O que vê e faz</th></tr></thead><tbody>
    <tr><td><b>Gestora (admin)</b></td><td>Todos os clientes, cadastro de empresas, convites e permissões de usuários.</td></tr>
    <tr><td><b>Consultor</b></td><td>Todos os clientes: conduz diagnósticos, gera relatórios e mantém glossários.</td></tr>
    <tr><td><b>Cliente</b></td><td>Somente a própria empresa: responde o diagnóstico, vê o relatório e o glossário.</td></tr>
  </tbody></table>
  <p class="small muted">O cliente recebe um convite por e-mail, entra e define a senha em “Conta”. O isolamento entre empresas é garantido pelo próprio banco de dados.</p>
  ${img("01-login", "Tela de acesso.")}
  <h2>Início</h2>
  <p>Mostra o nível atual da empresa, o score, as notas por capacidade e os próximos passos. Pela barra “Pergunte ao assistente” você tira dúvidas sobre o resultado a qualquer momento.</p>
  ${img("02-inicio", "Início: nível, score, capacidades e próximos passos.")}
</section>

<section class="flow">
  <h1>Passo a passo do diagnóstico</h1>
  <ol class="steplist">
    <li><div><b>Crie o diagnóstico</b> em Diagnósticos → “Novo diagnóstico”. Para um novo ciclo, use “Duplicar” e parta das respostas anteriores.</div></li>
    <li><div><b>Preencha o contexto</b>: escopo, quem responde, sistemas usados, principais dificuldades e as áreas que entram no diagnóstico.</div></li>
    <li><div><b>Responda as perguntas</b> seção por seção — clicando nas opções ou conversando com o assistente. Tudo é salvo automaticamente.</div></li>
    <li><div><b>Revise</b> os alertas de consistência e peça a revisão do assistente antes de concluir.</div></li>
    <li><div><b>Conclua</b> e abra o relatório.</div></li>
  </ol>
  ${img("04-contexto", "Etapa inicial: contexto da empresa. À esquerda, o mapa das seções; à direita, o resultado parcial.")}
  ${img("05-perguntas", "Perguntas de uma capacidade. “Não sei” é uma resposta válida; “Explicar” chama o assistente; “Evidência” registra a prova.")}
</section>

<section class="flow">
  <h2 style="margin-top:0">Responder conversando</h2>
  <p>Em qualquer seção, clique em <b>Responder conversando</b>. O assistente faz as perguntas em linguagem simples, entende o que a pessoa contou e propõe as marcações com a justificativa. Você aplica com um clique — nada muda sem a sua confirmação.</p>
  ${img("06-entrevista", "Entrevista guiada: o assistente sugere as marcações e faz a próxima pergunta.")}
  <div class="grid2">
    <div class="box avoid"><div class="t">“Não sei”</div><p class="small muted" style="margin:1mm 0 0">Use sem medo. Vira ponto a investigar e o assistente sugere a quem perguntar e que evidência pedir.</p></div>
    <div class="box avoid"><div class="t">Evidência</div><p class="small muted" style="margin:1mm 0 0">Registre o que comprova a resposta (um relatório, uma conferência, quem faz e com que frequência). Aumenta a confiabilidade do diagnóstico.</p></div>
  </div>
  ${img("07-revisao", "Revisão: perguntas pendentes, respostas “Não sei” e alertas de consistência.")}
</section>

<section class="flow">
  <h1>O relatório</h1>
  <p>Reúne o nível atribuído (e o que o limita), a leitura executiva escrita pelo assistente, as notas por capacidade, o mapa de qualidade por área, os pontos de atenção e os próximos passos (com botão para transformar cada passo em Prioridade). Use “Exportar PDF” para compartilhar.</p>
  <div class="callout avoid"><b>Anotações do relatório.</b> Peça ao assistente um texto — e-mail para a diretoria, pauta da reunião de resultados, justificativa do nível — e clique em “Salvar no relatório”. O texto passa a fazer parte do relatório e do PDF.</div>
  ${img("08-relatorio", "Nível atribuído e leitura executiva.")}
  ${img("09-plano", "Próximos passos: perfil da empresa e Onda 1 detalhada.")}
</section>

<section class="flow">
  <h1>Glossário de KPIs</h1>
  <p>Uma ficha por indicador: definição, fórmula, premissas, exclusões, owner, steward, tabelas de origem e conferências de qualidade. Comece pela <b>Biblioteca Moulis</b> (indicadores de referência) e adapte com o owner de cada um. O assistente redige fichas novas e revisa as existentes.</p>
  ${img("10-glossario", "Glossário de KPIs com completude de cada ficha.")}
  ${img("11-kpi", "Ficha de um KPI com revisão pelo assistente.")}
</section>

<section class="flow">
  <h1>Painel de clientes</h1>
  <p class="muted">Exclusivo da equipe Moulis.</p>
  <p>Carteira de clientes com o andamento e o nível de cada diagnóstico, comparativo de maturidade entre empresas e a aba <b>Usuários</b> para convidar pessoas e definir perfis. Para trocar de cliente, use o seletor “Empresa” na barra lateral.</p>
  ${img("12-clientes", "Carteira de clientes.")}
  <h2>O assistente</h2>
  <p>Fica disponível em todas as telas (botão “Assistente” no canto inferior direito). Ele:</p>
  <ul>
    <li><b>explica</b> conceitos e perguntas com exemplos práticos;</li>
    <li><b>interpreta</b> o resultado com base nos números da empresa;</li>
    <li><b>conduz</b> o preenchimento em forma de conversa;</li>
    <li><b>redige</b> textos para o relatório;</li>
    <li><b>chama você</b> nos momentos certos — ao começar uma seção, quando você para, ao marcar “Não sei”, ao concluir uma seção e no relatório. Desligue em “Sugestões automáticas”, se preferir.</li>
  </ul>
  ${img("13-assistente", "O assistente aberto ao lado da página de metodologia.")}
  <div class="callout avoid"><b>Privacidade.</b> Nunca cole senhas ou tokens no chat. O sistema bloqueia textos que parecem segredos e remove padrões sensíveis antes de qualquer envio à IA.</div>
</section>

<section class="flow">
  <h1>Como conduzir uma sessão com o cliente</h1>
  <ol class="steplist">
    <li><div><b>Convide as pessoas certas.</b> Quem decide (diretoria/gerência da área) e quem opera os dados (analista, TI). Um gestor sozinho tende a superestimar a maturidade.</div></li>
    <li><div><b>Reserve 60–90 minutos</b> para a primeira sessão. O contexto e 3–4 capacidades cabem numa conversa; o restante pode ser completado depois.</div></li>
    <li><div><b>Peça evidências.</b> “Você consegue me mostrar?” é a pergunta mais valiosa do diagnóstico.</div></li>
    <li><div><b>Não negocie o “Não sei”.</b> Registre e siga em frente — vira item de investigação no plano.</div></li>
    <li><div><b>Revise antes de apresentar.</b> Rode a revisão do assistente e confirme os alertas com o time.</div></li>
    <li><div><b>Apresente com foco em ação.</b> Comece pelo nível e pelo que o limita; termine com as ações dos próximos 30 dias e seus responsáveis.</div></li>
  </ol>

  <h2>Perguntas frequentes</h2>
  <div class="concept"><b>Quanto tempo leva?</b><div class="small muted">Cerca de 40 minutos com as pessoas certas na sala. Pode ser feito em mais de uma sessão — tudo é salvo automaticamente.</div></div>
  <div class="concept"><b>Posso refazer depois?</b><div class="small muted">Sim. Duplique o diagnóstico a cada semestre para medir a evolução com as mesmas perguntas.</div></div>
  <div class="concept"><b>Por que o nível ficou abaixo da média?</b><div class="small muted">Porque algum requisito fundamental está pendente (owner formal, chave mestra ou conferência de qualidade). O relatório mostra qual.</div></div>
  <div class="concept"><b>A IA decide o nível?</b><div class="small muted">Não. O nível é calculado por regras transparentes. A IA sugere respostas, explica e redige — sempre com confirmação do usuário.</div></div>
  <div class="concept"><b>Os dados de um cliente ficam visíveis para outro?</b><div class="small muted">Não. Cada empresa só acessa os próprios dados; somente a equipe Moulis vê a carteira.</div></div>
</section>
</body></html>`;

writeFileSync(join(ROOT, "docs/guia/guia.html"), html);
console.log("docs/guia/guia.html gerado");
