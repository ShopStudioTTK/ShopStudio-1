import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl } from "@/lib/entrada";

/**
 * Pedido de IA (roteiro ou pergunta) feito antes do F5: a tela pergunta por ele até ficar pronto.
 * O servidor termina o trabalho mesmo sem a aluna na página e guarda o que a rota teria devolvido.
 * 202 = ainda escrevendo; 404 = não chegou ao servidor ou a IA nem respondeu (crédito devolvido).
 */
export async function GET(req: Request) {
  const auth = await autenticar(req, "pedidos", "Faça login.");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Pedido inválido.", 400);
  try {
    // maxDuration das rotas de IA é 60 s: depois de 90 s sem resultado, a função caiu.
    const [linha] = await db()`
      select resultado, created_at < now() - interval '90 seconds' as vencido
      from public.ai_perguntas where user_id = ${auth.userId} and pedido = ${id}`;
    if (!linha) return erro("Esse pedido não chegou a ser feito, e nenhum crédito foi usado. Tente de novo.", 404);
    const resultado = linha.resultado as { status: number; corpo: unknown } | null;
    if (resultado) return Response.json(resultado.corpo, { status: resultado.status });
    if (linha.vencido) return erro("A IA não terminou a tempo. Tente de novo.", 504);
    return Response.json({ pendente: true }, { status: 202 });
  } catch (e) {
    console.error("pedidos: falha ao ler o pedido", e);
    return erro("Não consegui recuperar esse pedido agora.", 500);
  }
}
