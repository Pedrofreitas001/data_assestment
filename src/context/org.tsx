import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { store } from "../lib/store";
import type { Organization } from "../model/types";
import { useAuth } from "./auth";

interface OrgState {
  orgs: Organization[];
  org: Organization | null;
  orgId: string | null;
  setOrgId: (id: string) => void;
  reloadOrgs: () => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<OrgState>(null as never);
const KEY = "moulis:current-org";

export function OrgProvider({ children }: { children: ReactNode }) {
  const { profile, isStaff } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  const reloadOrgs = useCallback(async () => {
    const list = await store.list("organizations");
    list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    setOrgs(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile) reloadOrgs().catch(() => setLoading(false));
  }, [profile, reloadOrgs]);

  // Cliente fica preso à própria organização; staff escolhe.
  const effectiveId = useMemo(() => {
    if (!profile) return null;
    if (!isStaff) return profile.organization_id;
    if (orgId && orgs.some((o) => o.id === orgId)) return orgId;
    return orgs[0]?.id ?? null;
  }, [profile, isStaff, orgId, orgs]);

  const setOrgId = (id: string) => {
    setOrgIdState(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* ignore */
    }
  };

  const value: OrgState = {
    orgs,
    org: orgs.find((o) => o.id === effectiveId) ?? null,
    orgId: effectiveId,
    setOrgId,
    reloadOrgs,
    loading,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useOrg = () => useContext(Ctx);
