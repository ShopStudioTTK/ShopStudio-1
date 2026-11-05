import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl, texto } from "@/lib/entrada";

export const runtime = "nodejs";

/** Mural de resultados: todas as alunas veem todos os casos, mas não quem publicou (só "é meu"). */
export async function GET(req: Request) {
  const auth = await autenticar(req, "resultados", "Faça login.");
  if (auth instanceof Response) return auth;
  const linhas = await db()`
    select id, user_id, aluna, resultado, texto, midia_url, midia_tipo, destaque, created_at
    from public.success_cases order by destaque desc, created_at desc`;
  const casos = linhas.map(({ user_id, ...caso }) => ({ ...caso, minha: user_id === auth.userId }));
  return Response.json({ casos });
}

export async function POST(req: Request) {
  const auth = await autenticar(req, "resultados", "Faça login.");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const aluna = texto(body?.aluna, 200);
  if (!aluna) return erro("Coloque o nome da aluna.", 400);
  const midiaUrl = texto(body?.midiaUrl, 1000);
  if (midiaUrl && !/^https:\/\/\S+$/i.test(midiaUrl)) return erro("O link da mídia precisa começar com https://", 400);
  const midiaTipo = body?.midiaTipo === "video" ? "video" : "imagem";
  await db()`
    insert into public.success_cases (user_id, aluna, resultado, texto, midia_url, midia_tipo, destaque)
    values (${auth.userId}, ${aluna}, ${texto(body?.resultado, 200)}, ${texto(body?.texto, 2000)},
            ${midiaUrl}, ${midiaTipo}, ${body?.destaque === true})`;
  return new Response(null, { status: 201 });
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
