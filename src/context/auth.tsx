import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, IS_DEMO } from "../lib/supabase";
import type { Profile } from "../model/types";
import { DEMO_USER_ID } from "../lib/demoSeed";

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  isStaff: boolean;
  isAdmin: boolean;
  signInPassword: (email: string, password: string) => Promise<void>;
  signInMagic: (email: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  enterDemo: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as never);

const DEMO_PROFILE: Profile = { id: DEMO_USER_ID, email: "gestora@moulis.demo", full_name: "Gestora Moulis", role: "admin", organization_id: null };
const DEMO_KEY = "moulis:demo-session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(s: Session | null) {
    if (!s || !supabase) return setProfile(null);
    const { data } = await supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
    setProfile(
      (data as Profile) ?? { id: s.user.id, email: s.user.email || "", full_name: null, role: "cliente", organization_id: null },
    );
  }

  useEffect(() => {
    if (IS_DEMO) {
      try {
        if (localStorage.getItem(DEMO_KEY)) setProfile(DEMO_PROFILE);
      } catch {
        /* ignore */
      }
      setLoading(false);
      return;
    }
    supabase!.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase!.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const role = profile?.role;
  const value: AuthState = {
    loading,
    session,
    profile,
    isStaff: role === "admin" || role === "consultor",
    isAdmin: role === "admin",
    async signInPassword(email, password) {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
    },
    async signInMagic(email) {
      const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/` } });
      if (error) throw error;
    },
    async signUp(email, password, fullName) {
      const { error } = await supabase!.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) throw error;
    },
    async resetPassword(email) {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/conta` });
      if (error) throw error;
    },
    enterDemo() {
      try {
        localStorage.setItem(DEMO_KEY, "1");
      } catch {
        /* ignore */
      }
      setProfile(DEMO_PROFILE);
    },
    async signOut() {
      if (IS_DEMO) {
        try {
          localStorage.removeItem(DEMO_KEY);
        } catch {
          /* ignore */
        }
        setProfile(null);
        return;
      }
      await supabase!.auth.signOut();
      setProfile(null);
    },
    async refreshProfile() {
      await loadProfile(session);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
