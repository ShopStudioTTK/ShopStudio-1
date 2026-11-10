import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { uuid } from "@/lib/entrada";

export const runtime = "nodejs";

/** A aluna dá (ou troca) a nota de 1 a 5 de um gancho. Uma nota por aluna por gancho. */
export async function POST(req: Request) {
  const auth = await autenticar(req, "ganchos", "Faça login.");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const id = uuid(body?.id);
  const nota = body?.nota;
  if (!id || !Number.isInteger(nota) || nota < 1 || nota > 5) return erro("Dê uma nota de 1 a 5.", 400);
  try {
    await db()`
      insert into public.gancho_notas (gancho_id, user_id, nota) values (${id}, ${auth.userId}, ${nota})
      on conflict (gancho_id, user_id) do update set nota = excluded.nota, atualizado_em = now()`;
  } catch (e) {
    if ((e as { code?: string }).code === "23503") return erro("Esse gancho não existe mais.", 404);
    console.error("ganchos: falha ao gravar a nota", e);
    return erro("Não consegui salvar a nota. Tente de novo.", 500);
  }
  return new Response(null, { status: 204 });
}
