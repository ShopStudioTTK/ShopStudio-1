import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl } from "@/lib/entrada";

export const runtime = "nodejs";

/**
 * Histórico do assistente ("Conversas anteriores"), só da própria aluna. Sem ?id=: as 30 mais
 * recentes, sem as mensagens. Com ?id=: uma conversa inteira, para abrir e continuar.
 */
export async function GET(req: Request) {
  const auth = await autenticar(req, "conversas", "Faça login.");
  if (auth instanceof Response) return auth;
  const url = new URL(req.url);
  try {
    if (!url.searchParams.has("id")) {
      const conversas = await db()`
        select id, titulo, atualizado_em from public.conversas
        where user_id = ${auth.userId} order by atualizado_em desc limit 30`;
      return Response.json({ conversas });
    }
    const id = idDaUrl(req);
    if (!id) return erro("Pedido inválido.", 400);
    const [conversa] = await db()`
      select id, titulo, mensagens from public.conversas where user_id = ${auth.userId} and id = ${id}`;
    return conversa ? Response.json({ conversa }) : erro("Conversa não encontrada.", 404);
  } catch (e) {
    console.error("conversas: falha ao ler o histórico", e);
    return erro("Não consegui abrir suas conversas agora.", 500);
  }
}

/** ?id=<uuid>: só apaga se a conversa for da própria aluna. */
export async function DELETE(req: Request) {
  const auth = await autenticar(req, "conversas", "Faça login.");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Pedido inválido.", 400);
  const r = await db()`delete from public.conversas where user_id = ${auth.userId} and id = ${id}`;
  return r.count ? new Response(null, { status: 204 }) : erro("Conversa não encontrada.", 404);
}
