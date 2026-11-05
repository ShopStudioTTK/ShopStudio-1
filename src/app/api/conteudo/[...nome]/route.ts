import { getConteudo } from "@/content/protegido";
import type { ConteudoProtegido } from "@/content/types";
import { autenticar, erro } from "@/lib/api-auth";

export const runtime = "nodejs";

// Única saída do conteúdo pago (capítulos, ganchos, desafio, checklist): só com token válido e acesso.
export async function GET(req: Request, ctx: RouteContext<"/api/conteudo/[...nome]">) {
  const auth = await autenticar(req, "conteudo", "Faça login para ver o conteúdo.");
  if (auth instanceof Response) return auth;

  const { nome } = await ctx.params;
  const conteudo = getConteudo(nome.join("/") as keyof ConteudoProtegido);
  if (conteudo === undefined) return erro("Conteúdo não encontrado.", 404);

  return Response.json({ conteudo }, { headers: { "Cache-Control": "private, no-store" } });
}
