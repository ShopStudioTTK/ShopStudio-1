"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { mensagemDeCreditos, semCreditos } from "@/lib/limite";

export const CREDITOS_KEY = "creditos";

/**
 * Créditos da semana, contados no servidor. `aviso` só aparece perto do fim; `esgotado` trava a
 * tela (o servidor também recusa). Admin: ilimitado, sem aviso.
 */
export const useCreditos = () => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [CREDITOS_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<{ restantes?: number; ilimitado?: true }>("/api/creditos"),
  });
  const restantes = query.data?.ilimitado ? null : query.data?.restantes;
  return {
    pronto: query.isSuccess,
    esgotado: restantes != null && semCreditos(restantes),
    aviso: restantes != null ? mensagemDeCreditos(restantes) : null,
  };
};
