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


// ---------- Introdução: evidências e fontes (cada número tem fonte e tipo de evidência) ----------
type Ev = "ind" | "for" | "pre" | "est" | "lei" | "aca";
const EV_LABEL: Record<Ev, string> = { ind: "Pesquisa independente", for: "Pesquisa de fornecedor", pre: "Previsão", est: "Estimativa de especialista", lei: "Lei", aca: "Estudo acadêmico" };
const EV_CLASS: Record<Ev, string> = { ind: "ind", for: "for", pre: "pre", est: "est", lei: "lei", aca: "ind" };
const SOURCES: { n: number; ev: Ev; text: string; url: string }[] = [
  { n: 1, ev: "ind", text: "McKinsey & Company. The state of AI in 2025: Agents, innovation, and transformation (nov/2025) — 1.993 respondentes, 105 países.", url: "https://www.mckinsey.com/capabilities/operations/our-insights/the-state-of-ai" },
  { n: 2, ev: "ind", text: "IBM Institute for Business Value. 2025 CEO Study (comunicado de 06/05/2025) — 2.000 CEOs, 33 países.", url: "https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles" },
  { n: 3, ev: "pre", text: "Gartner. Lack of AI-Ready Data Puts AI Projects at Risk (comunicado de 26/02/2025) — previsão e pesquisa de 2024 com líderes de gestão de dados.", url: "https://www.gartner.com/en/newsroom/press-releases/2025-02-26-lack-of-ai-ready-data-puts-ai-projects-at-risk" },
  { n: 4, ev: "ind", text: "IBM / Ponemon Institute. Cost of a Data Breach Report 2025 — divulgação no Brasil (30/07/2025); 600 organizações no mundo, mar/2024 a fev/2025.", url: "https://brasil.newsroom.ibm.com/2025-07-30-Relatorio-da-IBM-Custo-medio-de-uma-violacao-de-dados-no-Brasil-atinge-R-7,19-milhoes" },
  { n: 5, ev: "ind", text: "BCG. AI Adoption in 2024: 74% of Companies Struggle to Achieve and Scale Value (24/10/2024) — 1.000 executivos, 59 países.", url: "https://www.bcg.com/press/24october2024-ai-adoption-in-2024-74-of-companies-struggle-to-achieve-and-scale-value" },
  { n: 6, ev: "for", text: "Informatica. CDO Insights 2025 (comunicado de 28/01/2025) — cerca de 600 diretores de dados.", url: "https://www.informatica.com/about-us/news/news-releases/2025/01/20250128-global-data-leaders-seek-to-harness-the-power-of-genai-for-ai-driven-success.html" },
  { n: 7, ev: "ind", text: "MIT NANDA. The GenAI Divide: State of AI in Business 2025, conforme Fortune (18/08/2025). Estudo muito citado e com metodologia criticada: use como sinal, não como medida.", url: "https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo" },
  { n: 8, ev: "pre", text: "Gartner. 80% of D&A Governance Initiatives Will Fail by 2027… (fev/2024), reprodução do comunicado.", url: "https://www.biztechreports.com/news-archive/2024/2/29/80-of-dampa-governance-initiatives-will-fail-by-2027-due-to-a-lack-of-a-real-or-manufactured-crisis-predicts-gartner" },
  { n: 9, ev: "pre", text: "Gartner. Worldwide AI Spending Will Total $1.5 Trillion in 2025 (17/09/2025).", url: "https://www.gartner.com/en/newsroom/press-releases/2025-09-17-gartner-says-worldwide-ai-spending-will-total-1-point-5-trillion-in-2025" },
  { n: 10, ev: "for", text: "Gartner (2020), Magic Quadrant for Data Quality Solutions — 154 clientes de fornecedores de qualidade de dados estimaram o custo da má qualidade (organizações de grande porte). Rastreado em Docsumo.", url: "https://www.docsumo.com/blog/cost-of-bad-data-statistics" },
  { n: 11, ev: "for", text: "Monte Carlo / Wakefield Research. 2022 State of Data Quality (09/08/2022) — 300 profissionais de dados; pesquisa encomendada por fornecedor.", url: "https://www.businesswire.com/news/home/20220809005223/en/Data-Engineers-Spend-Two-Days-Per-Week-Firefighting-Bad-Data-Monte-Carlo-Survey-Says" },
  { n: 12, ev: "est", text: "Redman, T. Seizing Opportunity in Data Quality. MIT Sloan Management Review (27/11/2017) — estimativa do autor a partir de Experian e outros dois estudos.", url: "https://sloanreview.mit.edu/article/seizing-opportunity-in-data-quality" },
  { n: 13, ev: "aca", text: "Brynjolfsson, Hitt & Kim. Strength in Numbers: How Does Data-Driven Decisionmaking Affect Firm Performance? ICIS 2011 — 179 grandes empresas de capital aberto.", url: "https://aisel.aisnet.org/icis2011/proceedings/economicvalueIS/13/" },
  { n: 14, ev: "lei", text: "Brasil. Lei nº 13.709/2018 (LGPD), art. 52, II — multa simples de até 2% do faturamento, limitada a R$ 50 milhões por infração.", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" },
];
const r = (...ns: number[]) => `<sup class="r">${ns.join(",")}</sup>`;
const ev = (e: Ev) => `<span class="ev ${EV_CLASS[e]}">${EV_LABEL[e]}</span>`;
const brl = (v: number) => (v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : `R$ ${Math.round(v / 1e3).toLocaleString("pt-BR")} mil`);
// Exercício de ordem de grandeza (premissas explícitas, para o cliente ajustar)
const REV = [20e6, 50e6, 100e6, 200e6];
const PCT = [0.005, 0.01, 0.02];
const HRS = { pessoas: 10, horas: 6, semanas: 46, custo: 80 };
const hrsAno = HRS.pessoas * HRS.horas * HRS.semanas * HRS.custo;

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
.toc li { counter-increment: t; display: flex; gap: 4mm; padding: 1.5mm 0; border-bottom: 1px solid #e7e7e3; font-size: 10pt; }
.toc li::before { content: counter(t, decimal-leading-zero); color: #9a9a95; font-variant-numeric: tabular-nums; width: 8mm; }
.part { font-size: 8pt; letter-spacing: 0.16em; text-transform: uppercase; color: #111; font-weight: 700; margin: 4.5mm 0 0.5mm; }

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

/* introdução: motivação e valor */
.stat { border: 1px solid #e3e3df; border-radius: 3mm; padding: 3mm 4mm; break-inside: avoid; }
.stat .big { font-family: "Plus Jakarta Sans"; font-weight: 800; font-size: 25pt; line-height: 1; letter-spacing: -0.03em; color: #111; }
.stat p { font-size: 8.8pt; color: #3b3b3b; margin: 1.5mm 0 0; line-height: 1.4; }
.stat .src { font-size: 7.5pt; color: #8a8a86; margin-top: 1.5mm; }
sup.r { font-size: 6.5pt; color: #6e6e6b; font-weight: 600; margin-left: 0.4mm; }
.ev { display: inline-block; font-size: 7.5pt; border-radius: 99px; padding: 0.3mm 2.2mm; white-space: nowrap; }
.ev.ind { background: #e7f3ec; color: #1d6b41; }
.ev.for { background: #fff1de; color: #8a4b00; }
.ev.pre { background: #e8eefd; color: #2a45a6; }
.ev.est { background: #f3e9f7; color: #7a2f94; }
.ev.lei { background: #efefec; color: #333; }
.lever { border: 1px solid #e3e3df; border-radius: 3mm; padding: 4mm 4.5mm; break-inside: avoid; }
.lever .k { font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #6e6e6b; font-weight: 700; }
.lever h3 { margin: 1mm 0 2mm; font-size: 12pt; }
.lever ul { margin: 0 0 2mm; padding-left: 4.2mm; font-size: 9pt; }
.lever li { margin-bottom: 1.2mm; }
.lever .how { border-top: 1px dashed #d8d8d3; padding-top: 2mm; font-size: 8.8pt; color: #3b3b3b; }
table.sens td, table.sens th { text-align: right; } table.sens td:first-child, table.sens th:first-child { text-align: left; }
.sources li { font-size: 7.9pt; margin-bottom: 1mm; line-height: 1.3; break-inside: avoid; }
.sources a { font-size: 7pt; }
table.tight td { padding: 1.7mm 2mm; }
.sources a { color: #1f4fd8; word-break: break-all; }
.pitch { background: #0b0b0b; color: #fff; border-radius: 3mm; padding: 4mm 5mm; margin: 3mm 0; break-inside: avoid; }
.pitch .k { font-size: 7.5pt; letter-spacing: .16em; text-transform: uppercase; color: #9a9a95; font-weight: 700; margin-bottom: 1.5mm; }
.pitch p { color: #f2f2ef; font-size: 10.2pt; margin: 0; line-height: 1.45; }
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
  <div class="foot"><span>Moulis Advisory</span><span>${today}</span></div>
</section>

<section class="page toc">
  <p class="eyebrow">Conteúdo</p>
  <h1>Sumário</h1>
  <div class="part">Introdução · Por que isso importa agora</div>
  <ol>
    <li>O cenário: IA em produção, governança atrás</li><li>Por que começar pela governança — e pela medição</li>
    <li>O custo de não governar</li><li>Onde o diagnóstico gera retorno</li><li>Resumo para apresentar e fontes</li>
  </ol>
  <div class="part">Parte 1 · Metodologia</div>
  <ol style="counter-reset:t 5">
    <li>Por que medir a maturidade de dados</li><li>Como o diagnóstico funciona</li><li>Os 5 níveis de maturidade</li>
    <li>Como o resultado é calculado</li><li>As 8 capacidades avaliadas</li><li>Qualidade dos dados por área</li>
    <li>Conceitos essenciais</li><li>Próximos passos e critérios de sucesso</li>
  </ol>
  <div class="part">Parte 2 · Como usar a ferramenta</div>
  <ol style="counter-reset:t 13">
    <li>Acesso e perfis</li><li>Passo a passo do diagnóstico</li><li>O relatório</li><li>Glossário de KPIs</li>
    <li>Painel de clientes (equipe Moulis)</li><li>O assistente</li><li>Como conduzir uma sessão com o cliente</li><li>Perguntas frequentes</li>
  </ol>
</section>


<section class="page">
  <p class="eyebrow">Introdução</p>
  <h1>IA em produção, governança de dados atrás</h1>
  <p class="lead">O uso de IA generativa já saiu do piloto e entrou na rotina das empresas. A base que a alimenta não acompanhou: dono do dado, fonte oficial, definição dos indicadores e qualidade conferida. Um modelo de linguagem responde com a mesma segurança sobre um número certo ou errado: sem definição, dono e qualidade conferida, a IA acelera o erro. As pesquisas mostram o resultado — muito uso, pouco retorno — e a causa mais citada é a mesma.</p>

  <h2 style="margin-top:6mm">O cenário em quatro números</h2>
  <div class="grid2">
    <div class="stat"><div class="big">88%</div><p>das organizações já usam IA em ao menos uma área do negócio — mas só cerca de um terço começou a escalar.${r(1)}</p><div class="src">McKinsey, 2025 · ${ev("ind")}</div></div>
    <div class="stat"><div class="big">25%</div><p>das iniciativas de IA entregaram o retorno esperado; 16% foram escaladas na empresa toda.${r(2)}</p><div class="src">IBM, 2.000 CEOs, 2025 · ${ev("ind")}</div></div>
    <div class="stat"><div class="big">60%</div><p>dos projetos de IA sem dados preparados para IA serão abandonados até 2026; 63% das organizações não têm, ou não sabem se têm, as práticas de dados adequadas.${r(3)}</p><div class="src">Gartner, 2025 · ${ev("pre")}</div></div>
    <div class="stat"><div class="big">87%</div><p>das organizações brasileiras estudadas não tinham política de governança de IA; 61% sem controle de acesso. O uso não autorizado de IA somou em média R$ 591 mil ao custo de um vazamento.${r(4)}</p><div class="src">IBM/Ponemon, Brasil, 2025 · ${ev("ind")}</div></div>
  </div>

  <h2>O que as pesquisas apontam como causa</h2>
  <ul class="small" style="padding-left:5mm;margin-bottom:3mm">
    <li><b>A trava é de organização, não de algoritmo.</b> Para a BCG (1.000 executivos), cerca de 70% dos desafios de IA são de pessoas e processos, 20% de tecnologia e 10% de algoritmos; 74% das empresas ainda não mostram valor tangível.${r(5)}</li>
    <li><b>Dado pronto é o gargalo declarado.</b> 43% dos líderes de dados apontam qualidade e prontidão dos dados como maior obstáculo; 67% não levaram nem metade dos pilotos de IA generativa à produção.${r(6)}</li>
    <li><b>Tecnologia desconectada.</b> 68% dos CEOs veem a arquitetura de dados integrada como crítica; metade admite ter tecnologia fragmentada pelo ritmo dos investimentos.${r(2)}</li>
    <li><b>O sinal mais forte — e mais contestado.</b> O MIT NANDA reportou 95% dos pilotos de IA generativa sem impacto mensurável no resultado; a metodologia é criticada, então vale como indício, não como medida.${r(7)}</li>
  </ul>


</section>

<section class="page">
  <h2 style="margin-top:0">Por que começar pela governança — e pela medição</h2>
  <p>Governar dados não é comprar uma plataforma. A Gartner prevê que 80% das iniciativas de governança de dados e analytics vão fracassar até 2027 — não por falha técnica, mas por não se ligarem a resultados de negócio. A recomendação é reduzir o escopo ao que gera resultado tangível, tratando oportunidade e risco, e avançar de forma ágil.${r(8)}</p>
  <p>É aqui que a medição de maturidade entra. Antes de investir em BI, automação ou IA, a empresa precisa saber <b>onde está</b>, <b>o que limita seu nível</b> e <b>em que ordem agir</b>. Os modelos de referência (DAMA-DMBOK, DCAM, DGI) colocam a governança — papéis, decisão e definições — no centro, e o DCAM avalia a maturidade por níveis, sem pular etapas: dono, fonte oficial, código comum entre sistemas e qualidade conferida vêm antes de automação e IA. Com um time de dados de uma ou duas pessoas, errar a ordem é o erro mais caro, e há muito dinheiro em jogo: o gasto mundial com IA chegou perto de <b>US$ 1,5 trilhão em 2025</b>${r(9)}, enquanto só um em cada quatro projetos entrega o retorno esperado.${r(2)}</p>

  <h2>O custo de não governar</h2>
  <p class="small muted">Bases e metodologias diferentes: <b>os números não devem ser somados</b>. Cada um mostra uma face do mesmo problema, com o tipo de evidência indicado; os de grande porte não se transferem direto para empresas médias. O valor de cada cliente se apura no diagnóstico.</p>
  <table class="tight">
    <thead><tr><th style="width:44%">O que foi medido</th><th>Número</th><th>Fonte</th></tr></thead>
    <tbody>
      <tr><td>Custo médio anual da má qualidade de dados, por organização${r(10)}</td><td><b>US$ 12,9 mi</b></td><td>Gartner, 2020 · ${ev("for")}<br/><span class="small muted">grandes empresas, valor estimado pelos próprios respondentes</span></td></tr>
      <tr><td>Parte da jornada de times de dados gasta checando e corrigindo qualidade${r(11)}</td><td><b>40%</b></td><td>Monte Carlo/Wakefield, 2022 · ${ev("for")}</td></tr>
      <tr><td>Parte da receita afetada por problemas de qualidade, segundo os respondentes${r(11)}</td><td><b>26%</b></td><td>Monte Carlo/Wakefield, 2022 · ${ev("for")}</td></tr>
      <tr><td>Custo da má qualidade como parcela da receita de empresas típicas${r(12)}</td><td><b>15% a 25%</b></td><td>Redman, MIT SMR, 2017 · ${ev("est")}</td></tr>
      <tr><td>Produtividade de empresas que decidem com base em dados, acima do esperado pelos demais investimentos${r(13)}</td><td><b>+5% a 6%</b></td><td>Brynjolfsson et al., 2011 · ${ev("aca")}</td></tr>
      <tr><td>Custo médio de um vazamento de dados no Brasil${r(4)}</td><td><b>R$ 7,19 mi</b><br/><span class="small muted">+6,5% sobre 2024</span></td><td>IBM/Ponemon, 2025 · ${ev("ind")}</td></tr>
      <tr><td>Multa máxima da LGPD${r(14)}</td><td><b>2% do faturamento</b><br/><span class="small muted">até R$ 50 mi por infração</span></td><td>Lei 13.709/2018 · ${ev("lei")}</td></tr>
    </tbody>
  </table>
  
</section>

<section class="page">
  <h2 style="margin-top:0">Onde o diagnóstico gera retorno</h2>
  <p>O diagnóstico não é um fim em si: é o instrumento que decide onde o dinheiro e as horas da empresa vão primeiro. O retorno aparece em três frentes.</p>
  <div class="grid3">
    <div class="lever">
      <div class="k">1 · Recursos</div><h3>Investir na ordem certa</h3>
      <ul>
        <li>~US$ 1,5 tri em IA no mundo, com 1 em 4 iniciativas entregando o ROI esperado.${r(9,2)}</li>
        <li>74% das empresas ainda sem valor tangível; cerca de 70% dos desafios de IA são de pessoas e processos.${r(5)}</li>
      </ul>
      <div class="how"><b>No app:</b> o nível e os requisitos fundamentais mostram o que limita a maturidade; o plano em 3 ondas, dimensionado ao tamanho do time, evita comprar BI ou IA antes de dono, fonte oficial e código comum.</div>
    </div>
    <div class="lever">
      <div class="k">2 · Operação</div><h3>Menos retrabalho, mais decisão</h3>
      <ul>
        <li>Times de dados gastam cerca de 40% da jornada com qualidade; média de 61 incidentes por mês, 13 h cada.${r(11)}</li>
        <li>Empresas orientadas por dados têm produtividade 5% a 6% acima do esperado.${r(13)}</li>
      </ul>
      <div class="how"><b>No app:</b> o mapa de qualidade por área aponta onde o dado não bate (faturamento × ERP, estoque, cadastro); o Glossário de KPIs com dono encerra o “qual número está certo?”; conciliações viram rotina.</div>
    </div>
    <div class="lever">
      <div class="k">3 · Receita e risco</div><h3>Proteger e destravar receita</h3>
      <ul>
        <li>Má qualidade estimada em 15% a 25% da receita; 26% da receita afetada na percepção de times de dados.${r(12,11)}</li>
        <li>Vazamento médio de R$ 7,19 mi no Brasil; multa LGPD de até 2% do faturamento.${r(4,14)}</li>
      </ul>
      <div class="how"><b>No app:</b> aponta onde o dado afeta preço, ruptura, cadastro, cobrança e funil, e cobre acessos, LGPD e regras de uso de IA, que reduzem a exposição.</div>
    </div>
  </div>

  <h2>Quanto vale 1% de receita</h2>
  <p class="small muted">Exercício de ordem de grandeza, não promessa: o tamanho do prêmio se uma base de dados melhor ajudar a recuperar de 0,5% a 2% da receita (ruptura, desconto indevido, inadimplência, retrabalho comercial). O diagnóstico identifica quais frentes se aplicam a cada empresa.</p>
  <table class="sens tight avoid">
    <thead><tr><th>Receita anual</th>${PCT.map((x) => `<th>${(x * 100).toLocaleString("pt-BR")}% da receita</th>`).join("")}</tr></thead>
    <tbody>${REV.map((v) => `<tr><td><b>${brl(v)}</b></td>${PCT.map((x) => `<td>${brl(v * x)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  <div class="box avoid" style="margin-top:4mm"><b>Exemplo de horas (premissas ajustáveis).</b> ${HRS.pessoas} pessoas × ${HRS.horas} h por semana em conciliação e retrabalho manual × ${HRS.semanas} semanas × R$ ${HRS.custo}/h = <b>${brl(hrsAno)} por ano</b>. Reduzir à metade libera cerca de <b>${brl(hrsAno / 2)}</b> em capacidade para análise e decisão. Premissas hipotéticas, a validar com cada cliente.</div>


</section>

<section class="page">
  <div class="pitch" style="margin-top:0">
    <div class="k">Para apresentar em 30 segundos</div>
    <p>As empresas estão investindo bilhões em IA sobre dados que ninguém governa — e só uma em cada quatro iniciativas entrega o retorno esperado. O passo mais barato e de maior alavancagem é medir onde a base de dados está e atacar o que limita o resultado. É isso que o diagnóstico Moulis faz em cerca de 40 minutos: entrega o nível de maturidade, o mapa do que está quebrado e um plano de 90 dias com responsável, entregável e prazo.</p>
  </div>
  <h2 style="margin-top:3mm;margin-bottom:2mm">Fontes e como ler os números</h2>
  <p class="small muted">Pesquisas têm populações e metodologias diferentes e não se somam. Previsões (Gartner) são projeções, não fatos medidos; pesquisas de fornecedores refletem a percepção de quem já enfrenta o problema; estimativas e exemplos aritméticos estão identificados como tais.</p>
  <ol class="sources" style="padding-left:5mm">${SOURCES.map((x) => `<li value="${x.n}">${ev(x.ev)} ${esc(x.text)}<br/><a href="${x.url}">${x.url}</a></li>`).join("")}</ol>
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
