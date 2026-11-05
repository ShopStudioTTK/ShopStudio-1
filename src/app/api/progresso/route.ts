import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { texto } from "@/lib/entrada";

export const runtime = "nodejs";

/** Capítulos concluídos e itens marcados (checklists, desafio, blocos dos capítulos) da aluna. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "progresso", "Faça login.");
  if (auth instanceof Response) return auth;
  const sql = db();
  const capitulos = await sql`select chapter_slug from public.chapter_progress where user_id = ${auth.userId}`;
  const checklist = await sql`select item_key from public.checklist_progress where user_id = ${auth.userId}`;
  return Response.json({
    capitulos: capitulos.map((r) => r.chapter_slug as string),
    checklist: checklist.map((r) => r.item_key as string),
  });
}

/** Marca ou desmarca: { tipo: "capitulo" | "checklist", chave, feito }. */
export async function POST(req: Request) {
  const auth = await autenticar(req, "progresso", "Faça login.");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const chave = texto(body?.chave, 200);
  if (!chave || !["capitulo", "checklist"].includes(body?.tipo) || typeof body?.feito !== "boolean")
    return erro("Pedido inválido.", 400);

  const sql = db();
  const { userId } = auth;
  if (body.tipo === "capitulo") {
    if (body.feito)
      await sql`insert into public.chapter_progress (user_id, chapter_slug) values (${userId}, ${chave}) on conflict (user_id, chapter_slug) do nothing`;
    else await sql`delete from public.chapter_progress where user_id = ${userId} and chapter_slug = ${chave}`;
  } else if (body.feito)
    await sql`insert into public.checklist_progress (user_id, item_key, done) values (${userId}, ${chave}, true) on conflict (user_id, item_key) do update set done = true`;
  else await sql`delete from public.checklist_progress where user_id = ${userId} and item_key = ${chave}`;

  return new Response(null, { status: 204 });
}
