import { ehFormato } from "@/content/formatos";
import { admin, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { gerarEmbedding } from "@/lib/embedding";
import { idDaUrl, SLUG, texto, uuid } from "@/lib/entrada";
import { linhaParaCartao, textoDaFicha } from "@/lib/fichas";
import { vetorSql } from "@/lib/treinamento";

export const runtime = "nodejs";

/**
 * Fichas de roteiro da expert: como ela pensaria o roteiro de um produto. Só admin (admin()
 * antes de ler qualquer coisa do pedido). Nada daqui devolve embedding nem criado_por.
 */
const MAX_CURTO = 120;
const MAX_PARTE = 500;
// ponytail: limite fixo, sem paginação; paginar se a expert passar disso.
const LIMITE = 200;

type Parte = { texto: string; porque: string | null; entonacao: string | null };
type Ficha = { produto: string; tipo: string; formato: string; gatilho: string; gancho: Parte; problema: Parte; solucao: Parte; cta: Parte };

const parteDe = (v: unknown, obrigatorios: boolean): Parte | null => {
  const p = (v ?? {}) as Record<string, unknown>;
  const parte = { texto: texto(p.texto, MAX_PARTE), porque: texto(p.porque, MAX_PARTE), entonacao: texto(p.entonacao, MAX_PARTE) };
  if (!parte.texto || (obrigatorios && (!parte.porque || !parte.entonacao))) return null;
  return parte as Parte;
};

/** Ficha do corpo, conferida; null = inválida. No gancho, porquê e entonação são obrigatórios. */
function fichaDe(body: Record<string, unknown> | null): Ficha | null {
  const produto = texto(body?.produto, MAX_CURTO);
  const tipo = texto(body?.tipo, MAX_CURTO);
  const formato = body?.formato;
  const gatilho = body?.gatilho;
  const gancho = parteDe(body?.gancho, true);
  const problema = parteDe(body?.problema, false);
  const solucao = parteDe(body?.solucao, false);
  const cta = parteDe(body?.cta, false);
  if (!produto || !tipo || typeof formato !== "string" || !ehFormato(formato)) return null;
  if (typeof gatilho !== "string" || !SLUG.test(gatilho) || !gancho || !problema || !solucao || !cta) return null;
  return { produto, tipo, formato, gatilho, gancho, problema, solucao, cta };
}

/** Vetor ou null: embedding fora do ar nunca impede de salvar (a tela avisa "não indexada"). */
const vetorDe = (f: Ficha) =>
  gerarEmbedding(textoDaFicha(f.produto, f.tipo)).then(vetorSql, (e) => {
    console.error("fichas: falha no embedding", e);
    return null;
  });

const MSG_INVALIDA = "Preencha produto, tipo, formato, gatilho e o texto de cada parte (no gancho, também o porquê e a entonação).";
const ehFkDoGatilho = (e: unknown) => (e as { code?: string })?.code === "23503";

export async function GET(req: Request) {
  const auth = await admin(req, "fichas");
  if (auth instanceof Response) return auth;
  const linhas = await db()`
    select f.id, f.produto, f.tipo, f.formato, f.gancho_gatilho, g.rotulo as gatilho_rotulo,
      f.gancho, f.gancho_porque, f.gancho_entonacao, f.problema, f.problema_porque, f.problema_entonacao,
      f.solucao, f.solucao_porque, f.solucao_entonacao, f.cta, f.cta_porque, f.cta_entonacao,
      f.embedding is not null as indexada
    from public.fichas_roteiro f join public.gatilhos g on g.slug = f.gancho_gatilho
    order by f.criado_em desc
    limit ${LIMITE}`;
  return Response.json({ fichas: linhas.map((l) => ({ ...linhaParaCartao(l), indexada: Boolean(l.indexada) })) });
}

export async function POST(req: Request) {
  const auth = await admin(req, "fichas");
  if (auth instanceof Response) return auth;
  const f = fichaDe(await req.json().catch(() => null));
  if (!f) return erro(MSG_INVALIDA, 400);
  const v = await vetorDe(f);
  try {
    const [{ id }] = await db()`
      insert into public.fichas_roteiro (
        produto, tipo, formato, gancho, gancho_gatilho, gancho_porque, gancho_entonacao,
        problema, problema_porque, problema_entonacao, solucao, solucao_porque, solucao_entonacao,
        cta, cta_porque, cta_entonacao, embedding, criado_por)
      values (
        ${f.produto}, ${f.tipo}, ${f.formato}, ${f.gancho.texto}, ${f.gatilho}, ${f.gancho.porque}, ${f.gancho.entonacao},
        ${f.problema.texto}, ${f.problema.porque}, ${f.problema.entonacao}, ${f.solucao.texto}, ${f.solucao.porque}, ${f.solucao.entonacao},
        ${f.cta.texto}, ${f.cta.porque}, ${f.cta.entonacao}, ${v}::extensions.vector, ${auth.userId})
      returning id`;
    return Response.json({ id, indexada: v !== null }, { status: 201 });
  } catch (e) {
    if (ehFkDoGatilho(e)) return erro("Esse gatilho não existe.", 400);
    throw e;
  }
}

/** Editar: a ficha inteira de novo. O embedding é refeito (texto pequeno, edição rara). */
export async function PATCH(req: Request) {
  const auth = await admin(req, "fichas");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const id = uuid(body?.id);
  const f = fichaDe(body);
  if (!id) return erro("Ficha inválida.", 400);
  if (!f) return erro(MSG_INVALIDA, 400);
  const v = await vetorDe(f);
  try {
    const atualizadas = await db()`
      update public.fichas_roteiro set
        produto = ${f.produto}, tipo = ${f.tipo}, formato = ${f.formato},
        gancho = ${f.gancho.texto}, gancho_gatilho = ${f.gatilho}, gancho_porque = ${f.gancho.porque}, gancho_entonacao = ${f.gancho.entonacao},
        problema = ${f.problema.texto}, problema_porque = ${f.problema.porque}, problema_entonacao = ${f.problema.entonacao},
        solucao = ${f.solucao.texto}, solucao_porque = ${f.solucao.porque}, solucao_entonacao = ${f.solucao.entonacao},
        cta = ${f.cta.texto}, cta_porque = ${f.cta.porque}, cta_entonacao = ${f.cta.entonacao},
        embedding = ${v}::extensions.vector, atualizado_em = now()
      where id = ${id}
      returning id`;
    if (!atualizadas.length) return erro("Ficha não encontrada.", 404);
    return Response.json({ id, indexada: v !== null });
  } catch (e) {
    if (ehFkDoGatilho(e)) return erro("Esse gatilho não existe.", 400);
    throw e;
  }
}

export async function DELETE(req: Request) {
  const auth = await admin(req, "fichas");
  if (auth instanceof Response) return auth;
  const id = idDaUrl(req);
  if (!id) return erro("Ficha inválida.", 400);
  const apagadas = await db()`delete from public.fichas_roteiro where id = ${id} returning id`;
  if (!apagadas.length) return erro("Ficha não encontrada.", 404);
  return new Response(null, { status: 204 });
}
