import { timingSafeEqual } from "node:crypto";
import { erro } from "@/lib/api-auth";
import { criarConta } from "@/lib/contas";
import { db } from "@/lib/db";
import { EMAIL } from "@/lib/entrada";
import { enviarEmailDeAcesso } from "@/lib/email";

export const runtime = "nodejs";

/**
 * Webhook da Applyfy (gateway de pagamento). Na compra paga do produto do Shop Studio, cria a
 * conta da aluna (`criarConta`: senha temporária + acesso) e manda o e-mail de acesso com o link,
 * o e-mail e a senha temporária. A senha nunca volta na resposta nem vai para o log.
 *
 * - Proteção: a Applyfy manda o token do webhook dentro do corpo (`token`), comparado em tempo
 *   constante com APPLYFY_WEBHOOK_TOKEN.
 * - Só age em TRANSACTION_PAID de um produto de APPLYFY_PRODUTO_IDS (`product.id` ou
 *   `externalId`, separados por vírgula). Atenção: TRANSACTION_CANCELED é cartão recusado.
 * - Idempotente por `transaction.id` (`compras_applyfy`): aviso repetido não gera outra senha.
 *   Se a conta ou o e-mail falharem, libera a transação e responde 500 para a Applyfy reenviar.
 * - Dado inválido (sem e-mail, sem transação) responde 200 com erro no log: reenviar não resolve.
 */

type Corpo = {
  event?: unknown;
  token?: unknown;
  client?: { name?: unknown; email?: unknown } | null;
  transaction?: { id?: unknown } | null;
  orderItems?: { product?: { id?: unknown; externalId?: unknown } | null }[] | null;
};

const tokenConfere = (enviado: unknown, esperado: string) => {
  if (typeof enviado !== "string") return false;
  const a = Buffer.from(enviado);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
};

const lista = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const ok = (status: string) => Response.json({ status });

export async function POST(req: Request) {
  const esperado = process.env.APPLYFY_WEBHOOK_TOKEN;
  if (!esperado) {
    console.error("webhook/applyfy: APPLYFY_WEBHOOK_TOKEN não configurado");
    return erro("Webhook não configurado.", 500);
  }
  const corpo = (await req.json().catch(() => null)) as Corpo | null;
  if (!tokenConfere(corpo?.token, esperado)) return erro("Não autorizado.", 401);
  const c = corpo!;

  if (c.event !== "TRANSACTION_PAID") return ok("ignorado");

  const produtos = lista(process.env.APPLYFY_PRODUTO_IDS);
  if (!produtos.length) {
    console.error("webhook/applyfy: APPLYFY_PRODUTO_IDS não configurado");
    return erro("Webhook não configurado.", 500);
  }
  const doProduto = (c.orderItems ?? []).some((i) =>
    [i?.product?.id, i?.product?.externalId].some((id) => id != null && produtos.includes(String(id))),
  );
  if (!doProduto) return ok("ignorado");

  const email = typeof c.client?.email === "string" ? c.client.email.trim().toLowerCase() : "";
  const transacao = c.transaction?.id != null ? String(c.transaction.id).trim() : "";
  if (email.length > 254 || !EMAIL.test(email) || !transacao) {
    console.error("webhook/applyfy: compra sem e-mail válido ou sem transação", { transacao });
    return ok("invalido");
  }
  const nome = typeof c.client?.name === "string" ? c.client.name.slice(0, 120) : null;

  const reservada = await db()`
    insert into public.compras_applyfy (transaction_id, email) values (${transacao}, ${email})
    on conflict (transaction_id) do nothing returning transaction_id`;
  if (!reservada.length) return ok("repetido");

  try {
    const r = await criarConta(email);
    await enviarEmailDeAcesso({ email, nome, senhaTemporaria: r === "existe" ? null : r.senhaTemporaria });
    return ok(r === "existe" ? "ja_tinha_conta" : "conta_criada");
  } catch (e) {
    console.error("webhook/applyfy: falha ao criar a conta ou mandar o e-mail", { transacao, erro: (e as Error).message });
    await db()`delete from public.compras_applyfy where transaction_id = ${transacao}`.catch(() => {});
    return erro("Não consegui liberar o acesso agora.", 500);
  }
}
