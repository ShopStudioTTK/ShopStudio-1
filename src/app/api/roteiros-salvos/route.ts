import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl, texto } from "@/lib/entrada";

export const runtime = "nodejs";

/** Só os roteiros da própria aluna. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "roteiros-salvos", "Faça login.");
  if (auth instanceof Response) return auth;
  const roteiros = await db()`
    select id, produto, formato, conteudo, created_at from public.saved_scripts
    where user_id = ${auth.userId} order by created_at desc`;
  return Response.json({ roteiros });
}

export async function POST(req: Request) {
  const auth = await autenticar(req, "roteiros-salvos", "Faça login.");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const produto = texto(body?.produto, 500);
  // Vai como texto e o banco converte (::text::jsonb): passado direto, o driver codificaria o JSON duas vezes.
  // Os cartões das fichas da expert nunca são gravados (dependem das fichas do momento).
  const conteudo =
    body?.conteudo && typeof body.conteudo === "object" ? JSON.stringify({ ...body.conteudo, fichas: undefined }) : null;
  if (!produto || !conteudo) return erro("Gere um roteiro antes de salvar.", 400);
  if (conteudo.length > 50_000) return erro("Roteiro grande demais para salvar.", 400);
  await db()`
    insert into public.saved_scripts (user_id, produto, formato, conteudo)
    values (${auth.userId}, ${produto}, ${texto(body?.formato, 100)}, ${conteudo}::text::jsonb)`;
  return new Response(null, { status: 201 });
}

/** ?id=<uuid>: só apaga se o roteiro for da própria aluna. */
export async function DELETE(req: Request) {
  const auth = await autenticar(req, "roteiros-salvos", "Faça login.");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Pedido inválido.", 400);
  const r = await db()`delete from public.saved_scripts where id = ${id} and user_id = ${auth.userId}`;
  return r.count ? new Response(null, { status: 204 }) : erro("Roteiro não encontrado.", 404);
}
