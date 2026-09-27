import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Briefcase, ClipboardCheck, Home, LogOut, Menu, Sigma } from "lucide-react";
import { useAuth } from "../context/auth";
import { useOrg } from "../context/org";
import { IS_DEMO } from "../lib/supabase";
import { initials } from "../lib/format";
import { MoulisMark } from "./ui";
import Copilot from "./Copilot";
import ErrorBoundary from "./ErrorBoundary";
import { useCopilot } from "../context/copilot";

const ROLE_LABEL = { admin: "Gestora · admin", consultor: "Consultor", cliente: "Cliente" } as const;

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, isStaff, signOut } = useAuth();
  const { orgs, org, orgId, setOrgId } = useOrg();
  const [open, setOpen] = useState(false);
  const copilot = useCopilot();
  const loc = useLocation();

  const nav = (
    <nav className="nav" onClick={() => setOpen(false)}>
      <NavLink to="/" end>
        <Home size={17} /> Início
      </NavLink>
      <NavLink to="/assessments">
        <ClipboardCheck size={17} /> Diagnósticos
      </NavLink>
      <NavLink to="/glossario">
        <Sigma size={17} /> Glossário de KPIs
      </NavLink>
      {isStaff && (
        <NavLink to="/admin">
          <Briefcase size={17} /> Clientes
        </NavLink>
      )}
    </nav>
  );

  return (
    <div className={`shell ${open ? "nav-open" : ""} ${copilot.isOpen ? "copilot-open" : ""}`}>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <MoulisMark size={18} />
          </span>
          <span>
            <div className="brand-name">moulis</div>
            <div className="brand-sub">Data Maturity</div>
          </span>
        </NavLink>

        <div className="org-switch">
          <label htmlFor="org-select">Empresa</label>
          {isStaff ? (
            <select id="org-select" value={orgId ?? ""} onChange={(e) => setOrgId(e.target.value)}>
              {!orgs.length && <option value="">Nenhuma empresa</option>}
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="org-fixed">{org?.name ?? "Sem empresa vinculada"}</div>
          )}
        </div>

        {nav}

        <div className="side-bottom">
          <NavLink to="/framework" className="side-link" onClick={() => setOpen(false)}>
            <BookOpen size={15} /> Metodologia
          </NavLink>
          {IS_DEMO && <div className="demo-tag">Modo demonstração · dados salvos só neste navegador</div>}
        </div>

        <div className="side-foot">
          <div className="avatar">{initials(profile?.full_name || profile?.email)}</div>
          <div className="side-user">
            <div className="n">{profile?.full_name || profile?.email}</div>
            <div className="r">{profile ? ROLE_LABEL[profile.role] : ""}</div>
          </div>
          <button className="side-btn" title="Sair" onClick={() => signOut()}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main">
        <div className="mobile-bar">
          <button className="side-btn" onClick={() => setOpen(true)} aria-label="Abrir menu" style={{ color: "#fff" }}>
            <Menu size={20} />
          </button>
          <span className="brand-name">moulis</span>
          <span className="xs" style={{ color: "#9b9b95", marginLeft: "auto", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {org?.name}
          </span>
        </div>
        <main className="content" key={loc.pathname.split("/")[1]}>
          <ErrorBoundary key={loc.pathname}>{children}</ErrorBoundary>
        </main>
      </div>
      <ErrorBoundary compact onReset={copilot.reset}>
        <Copilot />
      </ErrorBoundary>
    </div>
  );
}
