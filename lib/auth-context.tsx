import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authConfigured, supabase } from '@/lib/supabase';

type AuthValue = { loading: boolean; session: Session | null; user: User | null; signOut(): Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    let mounted = true;
    /*
     * A build with no Supabase configuration must still boot.
     *
     * This is the second half of the TestFlight crash fix. Making `supabase` fail on first use
     * instead of at import moved the throw out of module evaluation, but it landed here instead --
     * still during startup, still unhandled, still a SIGSEGV. Checking the flag is what actually
     * keeps the app alive: it settles as signed-out, the sign-in screen renders, and the consumer
     * sees the app rather than a crash. The real fix is supplying the variables; this is the guard
     * that stops a missing one from ever again costing the whole process.
     */
    if (!authConfigured) {
      setLoading(false);
      return () => { mounted = false; };
    }
    supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  const value = useMemo<AuthValue>(() => ({ loading, session, user: session?.user ?? null, async signOut() { if (authConfigured) await supabase.auth.signOut(); } }), [loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
