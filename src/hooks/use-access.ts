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
    queryFn: () => api<{ acesso: boolean; trocarSenha?: "pendente" | "expirada"; admin?: true }>("/api/acesso"),
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
    // A marca de senha temporária fica só no servidor: a tela recebe apenas o sim ou não.
    trocarSenha: acessoQuery.data?.trocarSenha,
    // Só para mostrar o menu de Treinamento; quem bloqueia é admin() no servidor.
    isAdmin: acessoQuery.data?.admin === true,
    senhaDefinida: () => queryClient.invalidateQueries({ queryKey: acessoKey }),
    isLoading: acessoQuery.isLoading,
    redeem,
  };
};
