"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api-cliente";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** true depois que a pessoa clicou em "Sair" (e não por sessão expirada). */
  saiu: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  saiu: false,
  signOut: async () => {},
});

// O primeiro login vira perfil (o servidor só grava se ainda não existir).
const ensureProfile = () => api("/api/perfil", { method: "POST" }).catch(() => {});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saiu, setSaiu] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_IN") setSaiu(false);

      if (nextSession?.user && event === "SIGNED_IN") {
        setTimeout(() => {
          void ensureProfile();
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Antes do signOut: a guarda da área logada reage à sessão sumindo e precisa já saber o motivo.
    setSaiu(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, saiu, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
