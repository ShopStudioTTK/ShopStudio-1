import { admin, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { idDaUrl } from "@/lib/entrada";
import { linhasDaPlanilha } from "@/lib/frases-musica";

export const runtime = "nodejs";

/**
 * Banco de frases da Música viral (2026-11-12). Só admin (admin() antes de ler o pedido).
 * A especialista cola as linhas da planilha (Categoria, Produto, Frase na tela, Tipo de frase,
 * Cena sugerida); a mesma frase do mesmo produto não entra duas vezes.
 */
// ponytail: limite fixo, sem paginação, como nas fichas.
const LIMITE = 500;
// Um colar grande da planilha, com folga.
const MAX_TEXTO = 200_000;
const MAX_LINHAS = 1000;

export async function GET(req: Request) {
  const auth = await admin(req, "frases-musica");
  if (auth instanceof Response) return auth;
  const frases = await db()`
    select id, categoria, produto, frase, tipo, cena, criado_em from public.frases_musica
    order by criado_em desc, id limit ${LIMITE}`;
  return Response.json({ frases });
}

/** { texto }: as linhas coladas. Devolve quantas entraram, quantas já existiam e as recusadas. */
export async function POST(req: Request) {
  const auth = await admin(req, "frases-musica");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto : "";
  if (!texto.trim()) return erro("Cole as linhas da planilha.", 400);
  if (texto.length > MAX_TEXTO) return erro("Texto grande demais: cole em partes.", 400);

  const lidas = linhasDaPlanilha(texto);
  const boas = lidas.flatMap((l) => (l.ok ? [l.exemplo] : []));
  const recusadas = lidas.flatMap((l) => (l.ok ? [] : [{ linha: l.linha, motivo: l.motivo }]));
  if (boas.length > MAX_LINHAS) return erro(`No máximo ${MAX_LINHAS} linhas por vez: cole em partes.`, 400);
  if (!boas.length) {
    const [r] = recusadas;
    return erro(r ? `Nenhuma linha entrou. Linha ${r.linha}: ${r.motivo}.` : "Nenhuma linha para importar.", 400);
  }

  const novas = await db()`
    insert into public.frases_musica (categoria, produto, frase, tipo, cena, criado_por)
    select c, p, f, t, s, ${auth.userId}
    from unnest(
      ${boas.map((b) => b.categoria)}::text[], ${boas.map((b) => b.produto)}::text[],
      ${boas.map((b) => b.frase)}::text[], ${boas.map((b) => b.tipo)}::text[], ${boas.map((b) => b.cena)}::text[]
    ) as x(c, p, f, t, s)
    on conflict (produto, frase) do nothing
    returning id`;
  return Response.json({ novas: novas.length, repetidas: boas.length - novas.length, recusadas }, { status: 201 });
}

/** ?id=<uuid> */
export async function DELETE(req: Request) {
  const auth = await admin(req, "frases-musica");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Frase inválida.", 400);
  const apagadas = await db()`delete from public.frases_musica where id = ${id} returning id`;
  if (!apagadas.length) return erro("Frase não encontrada.", 404);
  return new Response(null, { status: 204 });
}
