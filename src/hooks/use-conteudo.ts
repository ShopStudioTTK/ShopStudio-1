import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { ConteudoProtegido } from "@/content/types";

/**
 * Conteúdo pago, buscado em /api/conteudo/<nome> com o token da sessão.
 * Ele não vem no JavaScript da página (ver src/content/protegido.ts).
 */
export const useConteudo = <N extends keyof ConteudoProtegido>(nome: N | undefined) => {
  const { session } = useAuth();
  const token = session?.access_token;

  return useQuery({
    queryKey: ["conteudo", nome],
    enabled: Boolean(token && nome),
    staleTime: Infinity,
    queryFn: async (): Promise<ConteudoProtegido[N]> => {
      const res = await fetch(`/api/conteudo/${nome!.split("/").map(encodeURIComponent).join("/")}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? "Não consegui carregar o conteúdo. Tente de novo.");
      return json.conteudo;
    },
  });
};
