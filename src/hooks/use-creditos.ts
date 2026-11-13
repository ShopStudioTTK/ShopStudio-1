"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { mensagemDeCreditos, semCreditos, type Saldo, type TipoDeCredito } from "@/lib/limite";

export const CREDITOS_KEY = "creditos";

export const useSaldo = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [CREDITOS_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<Partial<Saldo> & { ilimitado?: true }>("/api/creditos"),
  });
};

/**
 * Créditos de um tipo (perguntas ou roteiros): os da semana mais os comprados, contados no servidor.
 * `aviso` só aparece perto do fim; `esgotado` trava a tela (o servidor também recusa). Admin: ilimitado.
 */
export const useCreditos = (tipo: TipoDeCredito) => {
  const query = useSaldo();
  const restantes = query.data?.ilimitado ? null : query.data?.restantes?.[tipo];
  const comprados = query.data?.comprados?.[tipo] ?? 0;
  return {
    pronto: query.isSuccess,
    esgotado: restantes != null && semCreditos(restantes + comprados),
    aviso: restantes != null ? mensagemDeCreditos(tipo, restantes, comprados) : null,
  };
};
