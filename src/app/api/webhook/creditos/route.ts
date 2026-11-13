import { timingSafeEqual } from "node:crypto";
import { creditosRestantes, darCreditos, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { EMAIL } from "@/lib/entrada";
import { PACOTES } from "@/lib/limite";

export const runtime = "nodejs";

/**
 * Webhook da compra de créditos (a plataforma de pagamento ainda não está ligada): recebe
 * { email, pacote, transacao }, credita o pacote (`PACOTES`, em src/lib/limite.ts) na conta da aluna
 * e responde quantos créditos ela tem agora (os da semana e os comprados).
 *
 * Proteção: o segredo `WEBHOOK_CREDITOS_SEGREDO` (Authorization: Bearer), separado do de criar conta,
 * porque este gera crédito pago. Sem CORS: é chamada de servidor. `transacao` (o id da venda) torna o
 * aviso repetido inofensivo: 200 com o saldo, sem creditar de novo.
 */

const segredoConfere = (req: Request, segredo: string) => {
  const enviado = Buffer.from(req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "");
  const esperado = Buffer.from(segredo);
  return enviado.length === esperado.length && timingSafeEqual(enviado, esperado);
};

export async function POST(req: Request) {
  const segredo = process.env.WEBHOOK_CREDITOS_SEGREDO;
  if (!segredo) {
    console.error("webhook/creditos: WEBHOOK_CREDITOS_SEGREDO não configurado");
    return erro("Webhook não configurado.", 500);
  }
  if (!segredoConfere(req, segredo)) return erro("Não autorizado.", 401);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) return erro("E-mail inválido.", 400);
  const pacote = PACOTES.find((p) => p.id === body?.pacote);
  if (!pacote) return erro("Pacote desconhecido.", 400);
  const transacao = typeof body?.transacao === "string" ? body.transacao.trim() : "";
  if (!transacao || transacao.length > 200) return erro("Falta o id da transação.", 400);

  try {
    const [aluna] = await db()`select id from auth.users where email = ${email}`;
    if (!aluna) return erro("Nenhuma conta com esse e-mail.", 404);
    const creditado = await darCreditos(aluna.id, pacote, transacao);
    const creditos = await creditosRestantes(aluna.id);
    return Response.json({ email, pacote: pacote.id, creditado, creditos }, { status: creditado ? 201 : 200 });
  } catch (e) {
    console.error("webhook/creditos: falha ao creditar", e);
    return erro("Não consegui creditar agora.", 500);
  }
}
