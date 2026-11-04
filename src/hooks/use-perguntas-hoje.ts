"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inicioDoDiaSP } from "@/lib/limite";

export const PERGUNTAS_HOJE_KEY = "perguntas-hoje";

/** Quantas perguntas ao assistente a aluna já fez hoje (horário de Brasília). */
export const usePerguntasHoje = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [PERGUNTAS_HOJE_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("ai_perguntas")
        .select("id", { count: "exact", head: true })
        .gte("created_at", inicioDoDiaSP().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
};
