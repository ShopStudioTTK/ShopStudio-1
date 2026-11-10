import { timingSafeEqual } from "node:crypto";
import { erro } from "@/lib/api-auth";
import { criarConta } from "@/lib/contas";
import { EMAIL } from "@/lib/entrada";

export const runtime = "nodejs";

/**
 * Webhook da plataforma de venda: recebe { email } e cria a conta da aluna, já com o acesso
 * liberado. Por enquanto devolve a senha temporária na resposta; quando houver envio de e-mail,
 * ele entra aqui.
 *
 * Proteção: o segredo `WEBHOOK_CONTA_SEGREDO` (Authorization: Bearer) é o que barra quem não é a
 * plataforma. A lista `WEBHOOK_CONTA_ORIGENS` (separada por vírgula) só controla o CORS: recusa
 * qualquer `Origin` fora dela, mas chamadas de servidor costumam não mandar `Origin` e um cliente
 * fora do navegador escreve o que quiser nesse cabeçalho.
 */

const origensPermitidas = () =>
  (process.env.WEBHOOK_CONTA_ORIGENS ?? "").split(",").map((o) => o.trim()).filter(Boolean);

/** Cabeçalhos de CORS para a origem do pedido, ou null se ela não está na lista. Sem Origin: {}. */
const cors = (req: Request): Record<string, string> | null => {
  const origem = req.headers.get("Origin");
  if (!origem) return {};
  if (!origensPermitidas().includes(origem)) return null;
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
};

const segredoConfere = (req: Request, segredo: string) => {
  const enviado = Buffer.from(req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "");
  const esperado = Buffer.from(segredo);
  return enviado.length === esperado.length && timingSafeEqual(enviado, esperado);
};

const comCors = (res: Response, headers: Record<string, string>) => {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
};

export async function OPTIONS(req: Request) {
  const headers = cors(req);
  return headers ? new Response(null, { status: 204, headers }) : erro("Origem não permitida.", 403);
}

export async function POST(req: Request) {
  const segredo = process.env.WEBHOOK_CONTA_SEGREDO;
  if (!segredo) {
    console.error("webhook/conta: WEBHOOK_CONTA_SEGREDO não configurado");
    return erro("Webhook não configurado.", 500);
  }
  const headers = cors(req);
  if (!headers) return erro("Origem não permitida.", 403);
  if (!segredoConfere(req, segredo)) return comCors(erro("Não autorizado.", 401), headers);

  const bruto = (await req.json().catch(() => null))?.email;
  const email = typeof bruto === "string" ? bruto.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) return comCors(erro("E-mail inválido.", 400), headers);

  try {
    const r = await criarConta(email);
    if (r === "existe") return comCors(erro("Já existe uma conta com esse e-mail.", 409), headers);
    return comCors(Response.json({ email, senhaTemporaria: r.senhaTemporaria }, { status: 201 }), headers);
  } catch (e) {
    console.error("webhook/conta: falha ao criar conta", e);
    return comCors(erro("Não consegui criar a conta agora.", 500), headers);
  }
}
