"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

export const PERGUNTAS_HOJE_KEY = "perguntas-hoje";

/** Quantas perguntas ao assistente a aluna já fez hoje (horário de Brasília), contadas no servidor. */
export const usePerguntasHoje = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [PERGUNTAS_HOJE_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ usadas: number }>("/api/assistente")).usadas,
  });
};
