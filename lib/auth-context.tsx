import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authConfigured, supabase } from '@/lib/supabase';

/**
 * How long the app waits to read a stored session before rendering the sign-in screen instead.
 *
 * Generous, because a keychain read on a cold start is not instant, but finite: past this the app
 * shows something a person can act on rather than a spinner with no end.
 */
export const SESSION_RESTORE_TIMEOUT_MS = 8000;

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
    /*
     * THE SESSION READ IS BOUNDED, AND IT CANNOT REJECT INTO NOTHING.
     *
     * This was `.then(...)` with no `.catch()`. The session lives across several keychain items
     * (see secure-chunk-store), so a read can fail or hang -- and when it did, `setLoading(false)`
     * never ran and the app sat on the startup spinner forever, with no error and no way out.
     *
     * Both holes are closed here. A rejection settles as signed-out, and a read that never settles
     * at all is given a deadline. Signed-out is the safe landing: it shows the sign-in screen,
     * which a person can act on, and it asserts nothing about a session we could not read. It never
     * destroys stored credentials -- `onAuthStateChange` below still delivers the real session if
     * the read completes late.
     */
    const settle = (next: Session | null) => {
      if (!mounted) return;
      setSession(next);
      setLoading(false);
    };

    const deadline = setTimeout(() => settle(null), SESSION_RESTORE_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data }) => settle(data.session))
      .catch(() => settle(null))
      .finally(() => clearTimeout(deadline));

    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => { mounted = false; clearTimeout(deadline); data.subscription.unsubscribe(); };
  }, []);
  const value = useMemo<AuthValue>(() => ({ loading, session, user: session?.user ?? null, async signOut() { if (authConfigured) await supabase.auth.signOut(); } }), [loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
