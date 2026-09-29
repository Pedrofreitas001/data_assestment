import { Lock } from "lucide-react";
import { BANDS, DIMENSIONS, DOMAINS } from "../model/framework";
import { DIM_PLAYBOOK } from "../model/playbook";
import { CONCEPTS, PRINCIPLES, QUALITY_EXPLAINED, REFERENCES, STEPS, SUCCESS, WAVES_DETAIL, WHY } from "../model/concepts";
import { PageHead } from "../components/ui";
import { useCopilot } from "../context/copilot";

const TOC = [
  { id: "porque", label: "Por que medir" },
  { id: "como", label: "Como funciona" },
  { id: "niveis", label: "Níveis" },
  { id: "calculo", label: "Cálculo" },
  { id: "capacidades", label: "Capacidades" },
  { id: "qualidade", label: "Qualidade dos dados" },
  { id: "conceitos", label: "Conceitos" },
  { id: "plano", label: "Plano de ação" },
];

export default function Framework() {
  const copilot = useCopilot();
  const gates = DIMENSIONS.flatMap((d) => d.questions.filter((q) => q.gate).map((q) => q.gate!));
  const groups = ["Papéis", "Arquitetura", "Qualidade e governança"] as const;

  return (
    <div className="method">
      <PageHead
        eyebrow="Metodologia"
        title="Como medimos a maturidade de dados"
        desc="Um método simples e replicável, baseado em DAMA-DMBOK, DGI, DCAM e NIST — adaptado à realidade de empresas de médio porte."
      />

      <nav className="toc no-print" aria-label="Nesta página">
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="chip chip-sm">
            {t.label}
          </a>
        ))}
      </nav>

      <section id="porque" className="card card-pad m-sec">
        <p className="section-title">{WHY.title}</p>
        <div className="prose">
          {WHY.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section id="como" className="card card-pad m-sec">
        <p className="section-title">Como funciona</p>
        <div className="steps-row">
          {STEPS.map((s) => (
            <div key={s.n} className="step-card">
              <span className="step-n">{s.n}</span>
              <div className="step-t">{s.title}</div>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
        <div className="principles">
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <div className="pr-t">{p.title}</div>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="niveis" className="card card-pad m-sec">
        <p className="section-title">Os 5 níveis</p>
        <div className="levels">
          {BANDS.map((b) => (
            <div key={b.level} className="level-col">
              <div className="level-num" style={{ color: b.color }}>
                {b.level}
              </div>
              <div className="level-name">{b.label}</div>
              <div className="xs muted" style={{ marginBottom: 6 }}>
                {b.min}–{Math.min(100, b.max)} pontos
              </div>
              <p>{b.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="calculo" className="grid g-2 m-sec">
        <section className="card card-pad">
          <p className="section-title">Como o resultado é calculado</p>
          <ul className="plain-list">
            <li>Cada resposta vira uma nota de 0 a 100 conforme a opção escolhida.</li>
            <li>“Não sei” vale 0 e aparece como ponto a investigar.</li>
            <li>
              <b>Score geral</b> = 60% capacidades + 40% qualidade dos dados por área.
            </li>
            <li>Qualidade, integração e governança pesam um pouco mais, porque sustentam todo o resto.</li>
            <li>A <b>confiabilidade</b> sobe quando tudo está respondido e com evidências.</li>
          </ul>
        </section>
        <section className="card card-pad">
          <p className="section-title">Requisitos fundamentais</p>
          <p className="small muted" style={{ marginTop: 0 }}>
            Mesmo com média alta, o nível fica limitado a 3 enquanto faltar:
          </p>
          <ul className="plain-list">
            {gates.map((g) => (
              <li key={g.reason}>
                <Lock size={12} style={{ marginRight: 6, verticalAlign: -1 }} />
                {g.reason}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section id="capacidades" className="card m-sec">
        <div className="card-head">
          <div>
            <h3 className="card-title">As 8 capacidades avaliadas</h3>
            <p className="card-sub">Clique para ver as perguntas e o primeiro passo recomendado.</p>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {DIMENSIONS.map((d, i) => (
            <details key={d.key} className="acc">
              <summary>
                <span className="acc-n">{i + 1}</span>
                <span className="grow">
                  <b style={{ fontWeight: 600 }}>{d.title}</b>
                  <span className="small muted" style={{ display: "block" }}>
                    {d.description}
                  </span>
                </span>
              </summary>
              <div className="acc-body">
                <ol className="small" style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                  {d.questions.map((q) => (
                    <li key={q.id} style={{ marginBottom: 4 }}>
                      {q.prompt}
                    </li>
                  ))}
                </ol>
                <div className="small">
                  <b>Primeiro passo quando está crítico:</b> {DIM_PLAYBOOK[d.key].critico}
                </div>
                <div className="xs muted" style={{ marginTop: 6 }}>
                  Referência: {d.refs}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section id="qualidade" className="card card-pad m-sec">
        <p className="section-title">Qualidade dos dados — 6 dimensões</p>
        <p className="small muted" style={{ marginTop: 0 }}>
          Para cada área avaliada perguntamos se os controles existem na prática — com a opção “Não se aplica” quando não fazem sentido. O relatório mostra um mapa área × dimensão.
          <br />
          <b>Núcleo, para toda empresa:</b> {DOMAINS.filter((d) => d.core).map((d) => d.title).join(", ")}.
          <br />
          <b>Módulos por setor:</b> {DOMAINS.filter((d) => !d.core).map((d) => d.title).join(", ")}.
        </p>
        <div className="q-grid">
          {QUALITY_EXPLAINED.map((q) => (
            <div key={q.key} className="q-item">
              <div className="pr-t">{q.label}</div>
              <div className="small">{q.text}</div>
              <div className="xs muted" style={{ marginTop: 4 }}>
                Ex.: {q.example}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="conceitos" className="card m-sec">
        <div className="card-head">
          <div>
            <h3 className="card-title">Conceitos essenciais</h3>
            <p className="card-sub">O vocabulário mínimo para conversar sobre dados na empresa.</p>
          </div>
          <button className="btn btn-sm no-print" onClick={() => copilot.ask("Explique com um exemplo prático a diferença entre Data Owner, Data Steward e Data User.", "Explique owner, steward e user")}>
            Pedir exemplo ao assistente
          </button>
        </div>
        <div className="card-body">
          {groups.map((g) => (
            <div key={g} className="concept-group">
              <div className="concept-g">{g}</div>
              <dl className="concepts">
                {CONCEPTS.filter((c) => c.group === g).map((c) => (
                  <div key={c.term}>
                    <dt>{c.term}</dt>
                    <dd>{c.def}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section id="plano" className="card card-pad m-sec">
        <p className="section-title">Próximos passos em ondas</p>
        <p className="small muted" style={{ marginTop: 0 }}>
          Cada resposta abaixo do ideal gera o passo que leva ao <b>próximo nível</b> daquela pergunta — com como fazer, entregável, quem conduz, prazo típico e critério de pronto. O plano começa pelo que limita o nível, sobe o que ataca o objetivo informado no contexto e cabe na capacidade do time: 3 passos na Onda 1 quando ninguém cuida de dados, até 5 quando há um time.
        </p>
        <div className="plan-cols">
          {WAVES_DETAIL.map((w) => (
            <div key={w.wave} className="plan-col">
              <div className="plan-head">
                <b>{w.wave}</b> <span className="muted">· {w.focus}</span>
              </div>
              <ul className="plain-list">
                {w.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <hr className="divider" />
        <p className="section-title">Como saber que deu certo</p>
        <ul className="plain-list">
          {SUCCESS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="card card-pad m-sec">
        <p className="section-title">Referências</p>
        <div className="q-grid">
          {REFERENCES.map((r) => (
            <div key={r.name} className="q-item">
              <div className="pr-t">{r.name}</div>
              <div className="small muted">{r.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
