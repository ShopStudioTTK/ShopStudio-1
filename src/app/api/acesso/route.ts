import { temAcesso } from "@/lib/access";
import { erro, logada, possuiEntitlement } from "@/lib/api-auth";
import { estadoDaSenhaTemporaria } from "@/lib/contas";
import { db } from "@/lib/db";
import { texto } from "@/lib/entrada";

export const runtime = "nodejs";

// Só login (sem checar acesso): é o que a guarda da área logada usa para saber o que mostrar.
export async function GET(req: Request) {
  const auth = await logada(req, "acesso", "Faça login.");
  if (auth instanceof Response) return auth;
  const [possui, senha] = await Promise.all([possuiEntitlement(auth.userId), estadoDaSenhaTemporaria(auth.userId)]);
  // Depois da troca, a resposta nem menciona senha.
  return Response.json({ acesso: temAcesso(possui), ...(senha ? { trocarSenha: senha } : {}) });
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
