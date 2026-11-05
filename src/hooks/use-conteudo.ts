import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import type { ConteudoProtegido } from "@/content/types";

/**
 * Conteúdo pago, buscado em /api/conteudo/<nome> com o token da sessão.
 * Ele não vem no JavaScript da página (ver src/content/protegido.ts).
 */
export const useConteudo = <N extends keyof ConteudoProtegido>(nome: N | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conteudo", nome],
    enabled: Boolean(user?.id && nome),
    staleTime: Infinity,
    queryFn: async () =>
      (await api<{ conteudo: ConteudoProtegido[N] }>(`/api/conteudo/${nome!.split("/").map(encodeURIComponent).join("/")}`))
        .conteudo,
  });
};
