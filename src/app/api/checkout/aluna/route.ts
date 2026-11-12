import { erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { EMAIL } from "@/lib/entrada";

export const runtime = "nodejs";

/**
 * Pública (sem login): a página /checkout pergunta se o e-mail já é de aluna do curso.
 * Só informativo, para mostrar o checkout certo; não libera nem bloqueia nada.
 * Responde só sim ou não, sem nenhum outro dado da aluna.
 * ponytail: sem limite de chamadas. Dá para descobrir se um e-mail é aluna testando um por um;
 * risco aceito (a resposta é só sim/não). Se virar abuso, limitar por IP na Vercel (firewall).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) return erro("Digite um e-mail válido.", 400);
  try {
    const achou = await db()`select 1 from public.alunas_curso where email = ${email} limit 1`;
    return Response.json({ aluna: achou.length > 0 });
  } catch (e) {
    console.error("checkout/aluna: falha ao consultar", (e as Error).message);
    return erro("Não consegui conferir agora. Tente de novo.", 500);
  }
}
