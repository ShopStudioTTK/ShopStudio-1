import { admin, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { slugDe, texto } from "@/lib/entrada";
import { listarGatilhos } from "@/lib/fichas";

export const runtime = "nodejs";

/** Gatilhos do gancho das fichas de roteiro. Só admin (a lista do gerador sai do servidor). */
export async function GET(req: Request) {
  const auth = await admin(req, "gatilhos");
  if (auth instanceof Response) return auth;
  return Response.json({ gatilhos: await listarGatilhos() });
}

/** O "+" da ficha: cria um gatilho. A checagem de admin vem antes de ler o corpo. */
export async function POST(req: Request) {
  const auth = await admin(req, "gatilhos");
  if (auth instanceof Response) return auth;
  const rotulo = texto((await req.json().catch(() => null))?.rotulo, 40);
  const slug = rotulo ? slugDe(rotulo) : "";
  if (!rotulo || !slug) return erro("Dê um nome para o gatilho (com letras ou números).", 400);
  const [gatilho] = await db()`
    insert into public.gatilhos (slug, rotulo) values (${slug}, ${rotulo})
    on conflict (slug) do nothing
    returning slug, rotulo`;
  if (!gatilho) return erro("Já existe um gatilho com esse nome.", 409);
  return Response.json({ gatilho: { slug: gatilho.slug, rotulo: gatilho.rotulo } }, { status: 201 });
}
