import { temAcesso } from "@/lib/access";
import { erro, logada, possuiEntitlement } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { texto } from "@/lib/entrada";

export const runtime = "nodejs";

// Só login (sem checar acesso): é o que a tela de código usa para saber se libera o app.
export async function GET(req: Request) {
  const auth = await logada(req, "acesso", "Faça login.");
  if (auth instanceof Response) return auth;
  return Response.json({ acesso: temAcesso(await possuiEntitlement(auth.userId)) });
}

export async function POST(req: Request) {
  const auth = await logada(req, "acesso", "Faça login.");
  if (auth instanceof Response) return auth;
  const codigo = texto((await req.json().catch(() => null))?.codigo, 100);
  if (!codigo) return erro("Digite o código.", 400);
  try {
    const [{ liberado }] = await db()`select public.resgatar_codigo(${auth.userId}, ${codigo}) as liberado`;
    return Response.json({ liberado });
  } catch (e) {
    // P0001 = mensagem escrita pela própria função (muitas tentativas erradas).
    if ((e as { code?: string }).code === "P0001") return erro((e as Error).message, 429);
    throw e;
  }
}
