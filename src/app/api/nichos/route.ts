import { admin, autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { SLUG, slugDe, texto } from "@/lib/entrada";

export const runtime = "nodejs";

/** Abas da tela de Campeões, na ordem em que foram criadas. */
export async function GET(req: Request) {
  const auth = await autenticar(req, "nichos", "Faça login.");
  if (auth instanceof Response) return auth;
  const nichos = await db()`select slug, rotulo from public.nichos order by criado_em`;
  return Response.json({ nichos });
}

/** Só admin: cria uma aba. A checagem de admin vem antes de ler o corpo. */
export async function POST(req: Request) {
  const auth = await admin(req, "nichos");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const rotulo = texto(body?.rotulo, 40);
  const slug = rotulo ? slugDe(rotulo) : "";
  if (!rotulo || !slug) return erro("Dê um nome para a aba (com letras ou números).", 400);
  const [nicho] = await db()`
    insert into public.nichos (slug, rotulo) values (${slug}, ${rotulo})
    on conflict (slug) do nothing
    returning slug, rotulo`;
  if (!nicho) return erro("Já existe uma aba com esse nome.", 409);
  return Response.json({ nicho }, { status: 201 });
}

/** Só admin: apaga uma aba (?slug=), e só se ela não tiver vídeos. */
export async function DELETE(req: Request) {
  const auth = await admin(req, "nichos");
  if (auth instanceof Response) return auth;
  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug || !SLUG.test(slug)) return erro("Aba inválida.", 400);
  const apagadas = await db()`
    delete from public.nichos n
    where n.slug = ${slug} and not exists (select 1 from public.campeoes c where c.nicho = n.slug)
    returning n.slug`;
  if (!apagadas.length) return erro("Tire os vídeos da aba antes de apagá-la.", 409);
  return new Response(null, { status: 204 });
}
