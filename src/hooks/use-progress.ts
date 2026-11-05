import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

type Progresso = { capitulos: string[]; checklist: string[] };
type Marcacao = { tipo: "capitulo" | "checklist"; chave: string; feito: boolean };

/** Capítulos e itens marcados, numa consulta só (GET /api/progresso), compartilhada pelos dois hooks. */
const useProgresso = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["progresso", user?.id];
  const query = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: () => api<Progresso>("/api/progresso"),
  });
  const marcar = useMutation({
    mutationFn: (m: Marcacao) => api("/api/progresso", { method: "POST", body: m }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  return { data: query.data, marcar };
};

export const useChapterProgress = () => {
  const { data, marcar } = useProgresso();
  const completed = useMemo(() => new Set(data?.capitulos ?? []), [data]);
  return {
    completed,
    isCompleted: (slug: string) => completed.has(slug),
    setChapterCompleted: (slug: string, done: boolean) =>
      marcar.mutate({ tipo: "capitulo", chave: slug, feito: done }),
    pending: marcar.isPending,
  };
};

export const useChecklistProgress = () => {
  const { data, marcar } = useProgresso();
  const done = useMemo(() => new Set(data?.checklist ?? []), [data]);
  return {
    done,
    isDone: (key: string) => done.has(key),
    toggle: (key: string, checked: boolean) => marcar.mutate({ tipo: "checklist", chave: key, feito: checked }),
  };
};
