import { hookCategorias, type HookCategoria } from "@/content/hooks";
import { admin, autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl, uuid } from "@/lib/entrada";
import { inicioDoDiaSP } from "@/lib/limite";

export const runtime = "nodejs";

/** Quantos ganchos cada aluna registra por dia (horário de Brasília), contra spam na comunidade. */
export const GANCHOS_POR_DIA = 10;

const categoriaDe = (v: unknown): HookCategoria | null =>
  hookCategorias.some((c) => c.id === v) ? (v as HookCategoria) : null;
/** O mesmo intervalo que o banco aceita (5 a 200). */
const textoDe = (v: unknown) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length >= 5 && t.length <= 200 ? t : null;
};

/**
 * Banco do Studio + ganchos da comunidade, com a média das notas e a nota da aluna logada.
 * Quem registrou cada gancho nunca sai daqui.
 */
export async function GET(req: Request) {
  const auth = await autenticar(req, "ganchos", "Faça login.");
  if (auth instanceof Response) return auth;
  const ganchos = await db()`
    select g.id, g.categoria, g.texto, g.comunidade,
      round(avg(n.nota), 1)::float8 as media, count(n.nota)::int as notas,
      max(n.nota) filter (where n.user_id = ${auth.userId}) as "minhaNota"
    from public.ganchos g left join public.gancho_notas n on n.gancho_id = g.id
    group by g.id
    order by g.comunidade, case when g.comunidade then g.criado_em end desc, g.criado_em`;
  return Response.json({ ganchos });
}

/** A aluna registra um gancho dela na comunidade, com o tipo que ela escolheu. */
export async function POST(req: Request) {
  const auth = await autenticar(req, "ganchos", "Faça login.");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const categoria = categoriaDe(body?.categoria);
  if (!categoria) return erro("Escolha o tipo do gancho.", 400);
  const txt = textoDe(body?.texto);
  if (!txt) return erro("Escreva o gancho com 5 a 200 caracteres.", 400);
  // ponytail: contar e gravar numa consulta só; duas abas ao mesmo tempo passam 1 do limite.
  const [gancho] = await db()`
    insert into public.ganchos (categoria, texto, comunidade, user_id)
    select ${categoria}, ${txt}, true, ${auth.userId}
    where (select count(*) from public.ganchos
           where user_id = ${auth.userId} and criado_em >= ${inicioDoDiaSP()}) < ${GANCHOS_POR_DIA}
    returning id, categoria, texto, comunidade`;
  if (!gancho) return erro(`Você já registrou ${GANCHOS_POR_DIA} ganchos hoje. Volte amanhã.`, 429);
  return Response.json({ gancho: { ...gancho, media: null, notas: 0, minhaNota: null } }, { status: 201 });
}

/** Só admin: edita o tipo e o texto de qualquer gancho (do banco ou da comunidade). */
export async function PATCH(req: Request) {
  const auth = await admin(req, "ganchos");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const id = uuid(body?.id);
  const categoria = categoriaDe(body?.categoria);
  const txt = textoDe(body?.texto);
  if (!id || !categoria || !txt) return erro("Gancho inválido: tipo e texto de 5 a 200 caracteres.", 400);
  const [gancho] = await db()`
    update public.ganchos set categoria = ${categoria}, texto = ${txt} where id = ${id}
    returning id, categoria, texto, comunidade`;
  if (!gancho) return erro("Esse gancho não existe mais.", 404);
  return Response.json({ gancho });
}

/** Só admin: apaga qualquer gancho (?id=); as notas vão junto. */
export async function DELETE(req: Request) {
  const auth = await admin(req, "ganchos");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Gancho inválido.", 400);
  await db()`delete from public.ganchos where id = ${id}`;
  return new Response(null, { status: 204 });
}
