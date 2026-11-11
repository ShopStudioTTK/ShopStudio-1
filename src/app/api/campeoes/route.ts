import { admin, autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl, SLUG, texto } from "@/lib/entrada";
import { linkCurtoDoTiktok, urlDoTiktok } from "@/lib/video";

export const runtime = "nodejs";

const ehSlug = (v: unknown): v is string => typeof v === "string" && SLUG.test(v);
// ponytail: sem paginação; paginar se algum nicho passar disso.
const LIMITE = 60;

/** Vídeos campeões de um nicho (?nicho=<slug>), cadastrados pela administração, os mais novos primeiro. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "campeoes", "Faça login.");
  if (auth instanceof Response) return auth;
  const nicho = new URL(req.url).searchParams.get("nicho");
  if (!ehSlug(nicho)) return erro("Nicho inválido.", 400);
  const videos = await db()`
    select id, url, titulo from public.campeoes where nicho = ${nicho} order by criado_em desc limit ${LIMITE}`;
  return Response.json({ videos });
}

/** Link completo do vídeo; o link curto do celular é resolvido lendo o redirecionamento (só o `Location`, sem abrir a página). */
async function resolverUrl(url: string): Promise<string | null> {
  const completo = urlDoTiktok(url);
  if (completo) return completo;
  const curto = linkCurtoDoTiktok(url);
  if (!curto) return null;
  try {
    const res = await fetch(curto, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    return urlDoTiktok(res.headers.get("location") ?? "");
  } catch {
    return null;
  }
}

/** Só admin: cadastra um vídeo do TikTok num nicho. */
export async function POST(req: Request) {
  const auth = await admin(req, "campeoes");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  if (!ehSlug(body?.nicho)) return erro("Nicho inválido.", 400);
  const url = await resolverUrl(String(body?.url ?? ""));
  if (!url) return erro("Cole o link do vídeo do TikTok (https://www.tiktok.com/@perfil/video/… ou vt.tiktok.com/…).", 400);
  const titulo = texto(body?.titulo, 120) ?? "";
  const [existe] = await db()`select 1 from public.nichos where slug = ${body.nicho}`;
  if (!existe) return erro("Essa aba não existe mais.", 400);
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
