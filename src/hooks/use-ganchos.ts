"use client";

import { useQuery } from "@tanstack/react-query";
import type { Gancho } from "@/content/hooks";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

/** Banco do Studio + comunidade (tabela `ganchos`). A chave leva o usuário: `minhaNota` é de cada conta. */
export const useGanchos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ganchos", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ ganchos: Gancho[] }>("/api/ganchos")).ganchos,
  });
};
