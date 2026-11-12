"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { mensagemDeCreditos, semCreditos, type TipoDeCredito } from "@/lib/limite";

export const CREDITOS_KEY = "creditos";

/**
 * Créditos da semana de um tipo (perguntas ou roteiros), contados no servidor. `aviso` só aparece
 * perto do fim; `esgotado` trava a tela (o servidor também recusa). Admin: ilimitado, sem aviso.
 */
export const useCreditos = (tipo: TipoDeCredito) => {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [CREDITOS_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<{ restantes?: Record<TipoDeCredito, number>; ilimitado?: true }>("/api/creditos"),
  });
  const restantes = query.data?.ilimitado ? null : query.data?.restantes?.[tipo];
  return {
    pronto: query.isSuccess,
    esgotado: restantes != null && semCreditos(restantes),
    aviso: restantes != null ? mensagemDeCreditos(tipo, restantes) : null,
  };
};
