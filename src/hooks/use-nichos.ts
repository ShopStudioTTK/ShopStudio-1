"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

/** Aba da tela de Campeões (tabela `nichos`, criada pela administração). */
export type Nicho = { slug: string; rotulo: string };

export const useNichos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["nichos"],
    enabled: Boolean(user?.id),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await api<{ nichos: Nicho[] }>("/api/nichos")).nichos,
  });
};
