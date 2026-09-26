import { Lock } from "lucide-react";
import { BANDS, DIMENSIONS } from "../model/framework";
import { DIM_PLAYBOOK } from "../model/playbook";
import { PageHead } from "../components/ui";

export default function Framework() {
  const gates = DIMENSIONS.flatMap((d) => d.questions.filter((q) => q.gate).map((q) => ({ d, q })));
  return (
    <>
      <PageHead
        eyebrow="Metodologia"
        title="Como medimos a maturidade"
        desc="Baseado em DAMA-DMBOK, DGI, DCAM e NIST, adaptado à realidade de empresas de médio porte."
      />

      <section className="card card-pad" style={{ marginBottom: 20 }}>
        <p className="section-title">Os 5 níveis</p>
        <div className="levels">
          {BANDS.map((b) => (
            <div key={b.level} className="level-col">
              <div className="level-num" style={{ color: b.color }}>
                {b.level}
              </div>
              <div className="level-name">{b.label}</div>
              <p>{b.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid g-2" style={{ marginBottom: 20 }}>
        <section className="card card-pad">
          <p className="section-title">Como o score é calculado</p>
          <ul className="plain-list">
            <li>Cada resposta vira uma nota de 0 a 100.</li>
            <li>“Não sei” vale 0 — desconhecer o próprio dado também é um achado.</li>
            <li>Score geral = 60% capacidades + 40% qualidade dos dados por área.</li>
            <li>A confiabilidade do diagnóstico sobe com respostas completas e evidências.</li>
          </ul>
        </section>
        <section className="card card-pad">
          <p className="section-title">Requisitos que limitam o nível</p>
          <p className="small muted" style={{ marginTop: 0 }}>
            Sem estes fundamentos o nível não passa de 3, mesmo que a média seja maior.
          </p>
          <ul className="plain-list">
            {gates.map(({ q }) => (
              <li key={q.id}>
                <Lock size={12} style={{ marginRight: 6, verticalAlign: -1 }} />
                {q.gate!.reason}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">As 8 capacidades avaliadas</h3>
            <p className="card-sub">Clique para ver as perguntas e a recomendação.</p>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 8 }}>
          {DIMENSIONS.map((d) => (
            <details key={d.key} className="acc">
              <summary>
                <span className="mono xs muted" style={{ width: 28, flexShrink: 0 }}>
                  {d.code}
                </span>
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
                  <b>Primeiro passo quando crítico:</b> {DIM_PLAYBOOK[d.key].critico}
                </div>
                <div className="xs muted" style={{ marginTop: 6 }}>
                  Referência: {d.refs}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
