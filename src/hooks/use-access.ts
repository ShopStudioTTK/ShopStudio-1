"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

export const useAccess = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const acessoKey = ["acesso", user?.id];

  // A regra (temAcesso) roda no servidor: a tela só recebe o sim ou não.
  const acessoQuery = useQuery({
    queryKey: acessoKey,
    enabled: Boolean(user?.id),
    queryFn: () => api<{ acesso: boolean }>("/api/acesso"),
  });

  const redeem = useMutation({
    mutationFn: async (code: string) => {
      const { liberado } = await api<{ liberado: boolean }>("/api/acesso", {
        method: "POST",
        body: { codigo: code.trim() },
      });
      return liberado;
    },
    onSuccess: (liberado) => {
      if (liberado) {
        void queryClient.invalidateQueries({ queryKey: acessoKey });
      }
    },
  });

  return {
    hasAccess: acessoQuery.data?.acesso ?? false,
    isLoading: acessoQuery.isLoading,
    redeem,
  };
};
