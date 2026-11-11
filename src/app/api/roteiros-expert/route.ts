import { autenticar, erro } from "@/lib/api-auth";
import { listarFichas } from "@/lib/fichas";

export const runtime = "nodejs";

/** Página "Roteiros expert": os roteiros que a expert registrou, com o porquê, para toda aluna com acesso. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "roteiros-expert", "Faça login.");
  if (auth instanceof Response) return auth;
  try {
    return Response.json({ fichas: await listarFichas() });
  } catch (e) {
    console.error("roteiros-expert: falha ao listar as fichas", e);
    return erro("Não consegui carregar os roteiros agora.", 500);
  }
}
