import { autenticar, creditosRestantes, ehAdmin, erro } from "@/lib/api-auth";

/** Quantos créditos restam à aluna (da semana e comprados), para o aviso e a página Créditos. Admin: ilimitado. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "creditos", "Faça login.");
  if (auth instanceof Response) return auth;
  try {
    if (await ehAdmin(auth.userId)) return Response.json({ ilimitado: true });
    return Response.json(await creditosRestantes(auth.userId));
  } catch (e) {
    console.error("creditos: falha ao ler os créditos", e);
    return erro("Não consegui ler seus créditos agora.", 500);
  }
}
