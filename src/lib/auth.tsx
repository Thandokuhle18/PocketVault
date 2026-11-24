import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Role = "Owner" | "Staff";
type Membership = { role: Role; businessId: string } | null;
type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  membershipLoading: boolean;
  membership: Membership;
  role: Role | null;
  signUp: (name: string, email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  loadMembership: () => Promise<Membership>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [membership, setMembership] = useState<Membership>(null);

  const loadMembership = useCallback(async (): Promise<Membership> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const user = currentSession?.user;
    if (!user) { setMembership(null); setMembershipLoading(false); return null; }
    setMembershipLoading(true);
    const { data, error } = await supabase.from("memberships").select("role,business_id").eq("user_id", user.id).maybeSingle();
    if (error) { setMembershipLoading(false); throw error; }
    const result = data ? { role: data.role as Role, businessId: data.business_id as string } : null;
    setMembership(result);
    setMembershipLoading(false);
    return result;
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) { setSession(data.session); setLoading(false); } });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setMembership(null);
      setMembershipLoading(!!nextSession);
      setLoading(false);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { if (session) void loadMembership().catch(() => setMembership(null)); }, [session, loadMembership]);

  const value = useMemo<AuthContextValue>(() => ({
    session, loading, membershipLoading, membership, role: membership?.role ?? null, loadMembership,
    signUp: async (name, email, password) => {
      const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim(), is_18_or_older: true }, emailRedirectTo: `${window.location.origin}/log-in?verified=1` } });
      return { error };
    },
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      return { error };
    },
    signOut: async () => { await supabase.auth.signOut(); setMembership(null); },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/log-in?reset=1` });
      return { error };
    },
  }), [session, loading, membershipLoading, membership, loadMembership]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
