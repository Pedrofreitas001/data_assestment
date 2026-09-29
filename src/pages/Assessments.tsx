import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Copy, FileBarChart, Plus, Trash2 } from "lucide-react";
import { useOrg } from "../context/org";
import { useAuth } from "../context/auth";
import { useToast } from "../context/toast";
import { useRows } from "../lib/useRows";
import { createAssessment } from "../lib/assessments";
import { uid } from "../lib/store";
import { relTime } from "../lib/format";
import { scoreAssessment } from "../model/scoring";
import { Bar, Empty, LevelPill, LoadingPage, PageHead, StatusBadge } from "../components/ui";

export default function Assessments() {
  const { org, orgId } = useOrg();
  const { profile } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const { rows, loading, remove, save } = useRows("assessments", orgId);

  async function start() {
    if (!org) return;
    const a = await createAssessment(org, profile?.id);
    nav(`/assessments/${a.id}`);
  }

  if (loading) return <LoadingPage />;

  return (
    <>
      <PageHead
        eyebrow={org?.name}
        title="Diagnósticos"
        desc="Cada diagnóstico é uma fotografia da maturidade. Repita a cada semestre para acompanhar a evolução."
        actions={
          <button className="btn btn-primary" onClick={start} disabled={!org}>
            <Plus size={16} /> Novo diagnóstico
          </button>
        }
      />
      <div className="card">
        {!rows.length ? (
          <Empty icon={<ClipboardCheck size={20} />} title="Nenhum diagnóstico ainda" action={<button className="btn btn-primary" onClick={start} disabled={!org}><Plus size={16} /> Iniciar</button>}>
            O primeiro diagnóstico define a linha de base da empresa.
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table table-stack">
              <thead>
                <tr>
                  <th>Diagnóstico</th>
                  <th>Status</th>
                  <th style={{ width: 160 }}>Progresso</th>
                  <th>Score</th>
                  <th>Nível</th>
                  <th>Atualizado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const s = scoreAssessment(a);
                  return (
                    <tr key={a.id} className="click" onClick={() => nav(`/assessments/${a.id}`)}>
                      <td className="c-main">
                        <div className="cell-title">{a.title}</div>
                        <div className="cell-sub">{a.scope || "—"}</div>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={a.status} />
                      </td>
                      <td data-label="Progresso">
                        <div className="row">
                          <div className="grow">
                            <Bar value={s.progress * 100} thin brand />
                          </div>
                          <span className="xs muted num">{Math.round(s.progress * 100)}%</span>
                        </div>
                      </td>
                      <td className="num serif c-score" data-label="Score" style={{ fontSize: 20 }}>
                        {s.overall === null ? "—" : Math.round(s.overall)}
                      </td>
                      <td data-label="Nível">
                        <LevelPill level={s.band?.level} light />
                      </td>
                      <td className="muted small nowrap" data-label="Atualizado">{relTime(a.updated_at)}</td>
                      <td className="c-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                          <button className="btn btn-ghost btn-sm btn-icon" title="Relatório" onClick={() => nav(`/assessments/${a.id}/resultado`)}>
                            <FileBarChart size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Duplicar para novo ciclo"
                            onClick={async () => {
                              const copy = await save({ ...a, id: uid(), title: `${a.title} (novo ciclo)`, status: "rascunho", ai_insights: null, created_at: undefined, updated_at: undefined });
                              toast("Diagnóstico duplicado");
                              nav(`/assessments/${copy.id}`);
                            }}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm btn-icon btn-danger"
                            title="Excluir"
                            onClick={async () => {
                              if (!confirm(`Excluir "${a.title}"? Essa ação não pode ser desfeita.`)) return;
                              await remove(a.id);
                              toast("Diagnóstico excluído");
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
