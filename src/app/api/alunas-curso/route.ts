import { admin, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { emailsDoTexto } from "@/lib/alunas-curso";

export const runtime = "nodejs";

const MAX_TEXTO = 500_000;
const MAX_EMAILS = 20_000;

/** Quantas alunas do curso estão na lista (só admin). */
export async function GET(req: Request) {
  const auth = await admin(req, "alunas-curso");
  if (auth instanceof Response) return auth;
  const [linha] = await db()`
    select count(*)::int as total, count(*) filter (where origem = 'compra')::int as compras
    from public.alunas_curso`;
  return Response.json({ total: linha?.total ?? 0, compras: linha?.compras ?? 0 });
}

/** Importa e-mails colados (só admin). Repetidos são ignorados. */
export async function POST(req: Request) {
  const auth = await admin(req, "alunas-curso");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto : "";
  if (texto.length > MAX_TEXTO) return erro("Texto grande demais. Cole em partes.", 400);
  const emails = emailsDoTexto(texto);
  if (!emails.length) return erro("Nenhum e-mail encontrado no texto.", 400);
  if (emails.length > MAX_EMAILS) return erro(`No máximo ${MAX_EMAILS} e-mails por vez.`, 400);
  const novas = await db()`
    insert into public.alunas_curso (email, origem)
    select e, 'importada' from unnest(${emails}::text[]) as x(e)
    on conflict (email) do nothing returning email`;
  return Response.json({ lidos: emails.length, novas: novas.length, repetidas: emails.length - novas.length }, { status: 201 });
}
