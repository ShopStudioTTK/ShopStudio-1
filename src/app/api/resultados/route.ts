import { admin, autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl, texto, uuid } from "@/lib/entrada";
import { inicioDoDiaSP } from "@/lib/limite";
import { nomeDoPerfil } from "@/lib/nome";
import { resolverUrlDoTiktok } from "@/lib/video";

export const runtime = "nodejs";

/** Contra spam, contado no próprio insert. */
const RESULTADOS_POR_DIA = 10;
const RESULTADO_MAX = 80;
const SEM_NOME = "Aluna do Shop Studio";

/** Mural de resultados: todas as alunas veem todos os casos, mas não quem publicou (só "é meu"). */
export async function GET(req: Request) {
  const auth = await autenticar(req, "resultados", "Faça login.");
  if (auth instanceof Response) return auth;
  const linhas = await db()`
    select id, user_id, aluna, resultado, texto, midia_url, destaque, created_at
    from public.success_cases order by destaque desc, created_at desc`;
  const casos = linhas.map(({ user_id, ...caso }) => ({ ...caso, minha: user_id === auth.userId }));
  return Response.json({ casos });
}

/** A aluna publica o dela: o nome vem da conta, a mídia só pode ser vídeo do TikTok. Fixar é só da admin (PATCH). */
export async function POST(req: Request) {
  const auth = await autenticar(req, "resultados", "Faça login.");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const depoimento = texto(body?.texto, 2000);
  const link = texto(body?.midiaUrl, 1000);
  const video = link ? await resolverUrlDoTiktok(link) : null;
  if (link && !video) return erro("Cole o link de um vídeo do TikTok.", 400);
  if (!depoimento && !video) return erro("Escreva o depoimento ou cole o link do vídeo.", 400);
  const aluna = nomeDoPerfil(auth.user.user_metadata) ?? SEM_NOME;
  const [criado] = await db()`
    insert into public.success_cases (user_id, aluna, resultado, texto, midia_url, midia_tipo)
    select ${auth.userId}, ${aluna}, ${texto(body?.resultado, RESULTADO_MAX)}, ${depoimento}, ${video}, 'video'
    where (select count(*) from public.success_cases where user_id = ${auth.userId} and created_at >= ${inicioDoDiaSP()}) < ${RESULTADOS_POR_DIA}
    returning id`;
  if (!criado) return erro(`Você publicou os ${RESULTADOS_POR_DIA} resultados de hoje. Amanhã tem mais.`, 429);
  return new Response(null, { status: 201 });
}

/** Só admin: fixa ou desafixa qualquer resultado no topo do mural. */
export async function PATCH(req: Request) {
  const auth = await admin(req, "resultados");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const id = uuid(body?.id);
  if (!id || typeof body?.destaque !== "boolean") return erro("Pedido inválido.", 400);
  const r = await db()`update public.success_cases set destaque = ${body.destaque} where id = ${id}`;
  return r.count ? new Response(null, { status: 204 }) : erro("Resultado não encontrado.", 404);
}

/** ?id=<uuid>: só apaga o caso se for da própria aluna. */
export async function DELETE(req: Request) {
  const auth = await autenticar(req, "resultados", "Faça login.");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Pedido inválido.", 400);
  const r = await db()`delete from public.success_cases where id = ${id} and user_id = ${auth.userId}`;
  return r.count ? new Response(null, { status: 204 }) : erro("Resultado não encontrado.", 404);
}
