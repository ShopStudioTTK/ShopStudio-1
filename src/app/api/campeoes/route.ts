import { admin, autenticar, erro } from "@/lib/api-auth";
import { NICHOS } from "@/content/nichos";
import { db } from "@/lib/db";
import { idDaUrl, texto } from "@/lib/entrada";
import { urlDoTiktok } from "@/lib/video";

export const runtime = "nodejs";

const ehNicho = (v: unknown): v is string => NICHOS.some((n) => n.slug === v);
// ponytail: sem paginação; paginar se algum nicho passar disso.
const LIMITE = 60;

/** Vídeos campeões de um nicho (?nicho=<slug>), cadastrados pela administração, os mais novos primeiro. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "campeoes", "Faça login.");
  if (auth instanceof Response) return auth;
  const nicho = new URL(req.url).searchParams.get("nicho");
  if (!ehNicho(nicho)) return erro("Nicho inválido.", 400);
  const videos = await db()`
    select id, url, titulo from public.campeoes where nicho = ${nicho} order by criado_em desc limit ${LIMITE}`;
  return Response.json({ videos });
}

/** Só admin: cadastra um vídeo do TikTok num nicho. */
export async function POST(req: Request) {
  const auth = await admin(req, "campeoes");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!ehNicho(body?.nicho)) return erro("Nicho inválido.", 400);
  const url = urlDoTiktok(String(body?.url ?? ""));
  if (!url) return erro("Cole o link completo do vídeo: https://www.tiktok.com/@perfil/video/…", 400);
  const titulo = texto(body?.titulo, 120) ?? "";
  const [video] = await db()`
    insert into public.campeoes (nicho, url, titulo) values (${body.nicho}, ${url}, ${titulo})
    on conflict (nicho, url) do nothing
    returning id, url, titulo`;
  if (!video) return erro("Esse vídeo já está nesse nicho.", 409);
  return Response.json({ video }, { status: 201 });
}

/** Só admin: tira um vídeo (?id=). */
export async function DELETE(req: Request) {
  const auth = await admin(req, "campeoes");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Vídeo inválido.", 400);
  await db()`delete from public.campeoes where id = ${id}`;
  return new Response(null, { status: 204 });
}
