import { useState } from "react";
import { Lock } from "lucide-react";
import { BANDS, DIMENSIONS, DOMAINS, QUALITY_DIMS } from "../model/framework";
import { DIM_PLAYBOOK, WAVES } from "../model/playbook";
import { LAYERS, PIPELINE_LEVELS, SENSITIVITY } from "../model/catalogOptions";
import { PageHead, Tabs } from "../components/ui";

type Tab = "niveis" | "capacidades" | "operacao" | "governanca";

export default function Framework() {
  const [tab, setTab] = useState<Tab>("niveis");
  return (
    <>
      <PageHead
        eyebrow="Manual de Data Governance v0.2"
        title="Framework Moulis"
        desc="Como a maturidade é medida, o que cada nível significa e as boas práticas por trás de cada pergunta. Baseado em DAMA-DMBOK, DGI, DCAM e NIST, adaptado à realidade de PMEs."
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: "niveis", label: "Níveis & cálculo" },
          { key: "capacidades", label: "8 capacidades" },
          { key: "operacao", label: "Consistência da operação" },
          { key: "governanca", label: "Papéis, camadas & pipeline" },
        ]}
      />

      {tab === "niveis" && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {BANDS.map((b) => (
              <div key={b.level} className="card card-pad" style={{ borderTop: `4px solid ${b.color}` }}>
                <div className="serif" style={{ fontSize: 44, lineHeight: 1, color: b.color }}>
                  {b.level}
                </div>
                <div style={{ fontWeight: 600, margin: "8px 0 4px" }}>{b.label}</div>
                <div className="xs" style={{ opacity: 0.6 }}>
                  {b.min}–{Math.min(100, b.max)} pontos
                </div>
                <p className="small" style={{ margin: "10px 0 0", opacity: 0.85 }}>
                  {b.summary}
                </p>
              </div>
            ))}
          </div>
          <div className="grid g-2">
            <div className="card card-pad">
              <p className="section-title">Como o score é calculado</p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Cada pergunta é normalizada de 0 a 100 pelo nível escolhido.</li>
                <li>
                  <b>“Não sei” vale 0</b> e vira ponto cego — desconhecer o próprio dado é um achado.
                </li>
                <li>Capacidades (D1–D8) são ponderadas: Qualidade 1,3; Integração e Governança 1,2; demais ~1.</li>
                <li>
                  Score geral = <b>60% capacidades + 40% consistência da operação</b>.
                </li>
                <li>A confiabilidade do diagnóstico sobe com cobertura e evidências registradas.</li>
              </ul>
            </div>
            <div className="card card-pad">
              <p className="section-title">Gates — não se pula etapa (DCAM)</p>
              {DIMENSIONS.flatMap((d) => d.questions.filter((q) => q.gate).map((q) => ({ d, q }))).map(({ d, q }) => (
                <div key={q.id} className="callout">
                  <div className="callout-title">
                    <Lock size={13} /> {d.code} · limita ao nível {q.gate!.capLevel}
                  </div>
                  <div className="small">{q.gate!.reason}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <p className="section-title">Roadmap em ondas</p>
            <div className="grid g-3">
              {([1, 2, 3] as const).map((w) => (
                <div key={w}>
                  <div style={{ fontWeight: 600 }}>{WAVES[w].label}</div>
                  <div className="small muted">{WAVES[w].focus}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "capacidades" && (
        <div className="stack">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="card">
              <div className="card-head">
                <div>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>
                    {d.code} · {d.refs} · peso {d.weight}
                  </p>
                  <h3 className="card-title" style={{ fontSize: 18 }}>
                    {d.title}
                  </h3>
                  <p className="card-sub">{d.description}</p>
                </div>
              </div>
              <div className="card-body">
                <div className="grid g-3" style={{ marginBottom: 16 }}>
                  {(["critico", "atencao", "maduro"] as const).map((t) => (
                    <div key={t} className="callout soft" style={{ margin: 0 }}>
                      <div className="callout-title">{t === "critico" ? "Crítico (< 40)" : t === "atencao" ? "Em desenvolvimento (40–67)" : "Maduro (≥ 67)"}</div>
                      <span className="small">{DIM_PLAYBOOK[d.key][t]}</span>
                    </div>
                  ))}
                </div>
                {d.questions.map((q) => (
                  <div key={q.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
                    <div style={{ fontWeight: 500 }}>
                      {q.prompt} {q.gate && <span className="badge badge-solid"><Lock size={10} /> Fundacional</span>}
                    </div>
                    <ol className="small muted" style={{ margin: "6px 0 0", paddingLeft: 20 }}>
                      {q.levels.map((l) => (
                        <li key={l.v}>{l.label}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "operacao" && (
        <div className="stack">
          <div className="card card-pad">
            <p className="section-title">Dimensões de qualidade</p>
            <div className="grid g-3">
              {QUALITY_DIMS.map((q) => (
                <div key={q.key}>
                  <div style={{ fontWeight: 600 }}>{q.label}</div>
                  <div className="small muted">{q.question}</div>
                </div>
              ))}
            </div>
          </div>
          {DOMAINS.map((d) => (
            <div key={d.key} className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title" style={{ fontSize: 18 }}>
                    {d.title}
                  </h3>
                  <p className="card-sub">
                    {d.description} Fontes típicas: {d.typicalSources.join(", ")}.
                  </p>
                </div>
              </div>
              <div className="card-body table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ponto de consistência</th>
                      <th>Qualidade</th>
                      <th>Ação recomendada se falhar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.checks.map((c) => (
                      <tr key={c.id}>
                        <td className="small">
                          {c.prompt} {c.critical && <span className="badge badge-risk">Crítico</span>}
                        </td>
                        <td className="small">{QUALITY_DIMS.find((q) => q.key === c.quality)?.label}</td>
                        <td className="small muted">{c.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "governanca" && (
        <div className="stack">
          <div className="grid g-3">
            {[
              { t: "Data Owner", d: "Autoridade de negócio sobre o domínio. Aprova premissas, prioriza demandas, responde pelas decisões sobre o dado.", p: "Gerente da área" },
              { t: "Data Steward", d: "Execução: ingestão, consolidação, primeira validação de qualidade. Ponto focal técnico do dia a dia.", p: "Analista sênior" },
              { t: "Data User", d: "Consome o dado consolidado para decidir, sem responsabilidade de manutenção.", p: "Times operacionais" },
            ].map((r) => (
              <div key={r.t} className="card card-pad">
                <div className="serif" style={{ fontSize: 24 }}>
                  {r.t}
                </div>
                <p className="small" style={{ margin: "8px 0" }}>
                  {r.d}
                </p>
                <span className="badge badge-soft">{r.p}</span>
              </div>
            ))}
          </div>
          <div className="callout">
            <div className="callout-title">Apontamento de campo</div>
            <span className="small">Governança emperra mais pela falta de owner do que de steward. Um steward sem owner produz dado tecnicamente correto, mas sem legitimidade — ninguém confia nele para decidir.</span>
          </div>
          <div className="grid g-2">
            <div className="card card-pad">
              <p className="section-title">Camadas (medallion)</p>
              {LAYERS.map((l) => (
                <div key={l.key} className="row-between small" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <b>{l.label}</b>
                  <span className="muted" style={{ textAlign: "right" }}>
                    {l.hint}
                  </span>
                </div>
              ))}
            </div>
            <div className="card card-pad">
              <p className="section-title">Maturidade de pipeline</p>
              {PIPELINE_LEVELS.map((l) => (
                <div key={l.v} className="row-between small" style={{ padding: "8px 0", borderTop: "1px solid var(--line)" }}>
                  <b>{l.label}</b>
                  <span className="muted" style={{ textAlign: "right" }}>
                    {l.hint}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <p className="section-title">Classificação de sensibilidade</p>
            <div className="grid g-4">
              {SENSITIVITY.map((s) => (
                <div key={s.key}>
                  <div style={{ fontWeight: 600 }}>{s.label}</div>
                  <div className="small muted">{s.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
