import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, s) => {
      // Avoid re-render storms on TOKEN_REFRESHED / tab-focus when nothing
      // meaningful changed (same user). Without this, every tab switch
      // causes a new session object → cascading effects → page "reloads".
      setSession((prev) => {
        if (prev?.user?.id === s?.user?.id && prev?.access_token === s?.access_token) {
          return prev;
        }
        return s;
      });
      setLoading(false);
    });

    // Then fetch existing session
    supabase.auth.getSession().then(({ data }) => {
      setSession((prev) => prev ?? data.session);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
