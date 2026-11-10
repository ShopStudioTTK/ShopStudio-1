import "server-only";
import { ehFormato } from "@/content/formatos";
import { db } from "@/lib/db";
import { gerarEmbedding } from "@/lib/embedding";
import { slugDe } from "@/lib/entrada";
import { PARTES, type FichaCartao, type Gatilho, type Parte } from "@/lib/fichas-tipos";
import { vetorSql } from "@/lib/treinamento";

/**
 * Fichas de roteiro da expert. Semelhança (1 - distância de cosseno) do produto da aluna com o
 * "produto — tipo" da ficha. Baixados de 0,6 / 0,7 em 2026-11-10: com nomes curtos, só o mesmo produto passava.
 */
export const LIMIAR_CARTAO = 0.45; // aparece no cartão "produtos parecidos" (mesma categoria ≈ 0,47)
export const LIMIAR_MODELO = 0.55; // entra no prompt do gerador como modelo
export const MAX_CARTAO = 3;

/** O embedding da ficha leva só o produto e o tipo, não o raciocínio. */
export const textoDaFicha = (produto: string, tipo: string) => `${produto} — ${tipo}`;

const opcional = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Linha do banco → ficha para as telas (as consultas nunca trazem embedding nem criado_por). */
export function linhaParaCartao(l: Record<string, unknown>): FichaCartao {
  const parte = (chave: string): Parte => ({
    texto: String(l[chave] ?? ""),
    porque: opcional(l[`${chave}_porque`]),
    entonacao: opcional(l[`${chave}_entonacao`]),
  });
  const [gancho, problema, solucao, cta] = PARTES.map((p) => parte(p.chave));
  return {
    id: String(l.id),
    produto: String(l.produto),
    tipo: String(l.tipo),
    formato: String(l.formato),
    gatilho: { slug: String(l.gancho_gatilho), rotulo: String(l.gatilho_rotulo ?? l.gancho_gatilho) },
    gancho,
    problema,
    solucao,
    cta,
    ...(l.similaridade != null && { similaridade: Number(l.similaridade) }),
  };
}

export const listarGatilhos = async (): Promise<Gatilho[]> =>
  (await db()`select slug, rotulo from public.gatilhos order by criado_em`).map((g) => ({
    slug: String(g.slug),
    rotulo: String(g.rotulo),
  }));

/** O gatilho que a IA devolveu, como slug da lista (aceita o rótulo e outra caixa); fora dela, "". */
export function gatilhoDaIa(valor: unknown, gatilhos: Gatilho[]): string {
  if (typeof valor !== "string") return "";
  const v = slugDe(valor);
  return gatilhos.find((g) => g.slug === v || slugDe(g.rotulo) === v)?.slug ?? "";
}

/** Cartão 1: fichas de produtos parecidos (≥ LIMIAR_CARTAO). Nunca lança: falha = sem cartão. */
export async function buscarParecidas(produto: string): Promise<FichaCartao[]> {
  try {
    const v = vetorSql(await gerarEmbedding(produto));
    const linhas = await db()`
      select f.id, f.produto, f.tipo, f.formato, f.gancho_gatilho, g.rotulo as gatilho_rotulo,
        f.gancho, f.gancho_porque, f.gancho_entonacao, f.problema, f.problema_porque, f.problema_entonacao,
        f.solucao, f.solucao_porque, f.solucao_entonacao, f.cta, f.cta_porque, f.cta_entonacao,
        1 - (f.embedding <=> ${v}::extensions.vector) as similaridade
      from public.fichas_roteiro f join public.gatilhos g on g.slug = f.gancho_gatilho
      where f.embedding is not null
      order by f.embedding <=> ${v}::extensions.vector
      limit ${MAX_CARTAO}`;
    return linhas.map(linhaParaCartao).filter((f) => (f.similaridade ?? 0) >= LIMIAR_CARTAO);
  } catch (e) {
    console.error("roteiro: falha ao buscar fichas parecidas", e);
    return [];
  }
}

/** Cartão 2: fichas com o mesmo formato e o mesmo gatilho, de qualquer produto, sem as do cartão 1. */
export async function buscarDoMesmoJeito(formato: string, gatilho: string, excluir: string[]): Promise<FichaCartao[]> {
  if (!ehFormato(formato) || !gatilho) return [];
  const linhas = await db()`
    select f.id, f.produto, f.tipo, f.formato, f.gancho_gatilho, g.rotulo as gatilho_rotulo,
      f.gancho, f.gancho_porque, f.gancho_entonacao, f.problema, f.problema_porque, f.problema_entonacao,
      f.solucao, f.solucao_porque, f.solucao_entonacao, f.cta, f.cta_porque, f.cta_entonacao
    from public.fichas_roteiro f join public.gatilhos g on g.slug = f.gancho_gatilho
    where f.formato = ${formato} and f.gancho_gatilho = ${gatilho} and not (f.id = any(${excluir}::uuid[]))
    order by f.criado_em desc
    limit ${MAX_CARTAO}`;
  return linhas.map(linhaParaCartao);
}

const textoDaParte = (rotulo: string, p: Parte) =>
  [`- ${rotulo}: ${p.texto}`, p.porque && `  Por quê: ${p.porque}`, p.entonacao && `  Entonação: ${p.entonacao}`]
    .filter(Boolean)
    .join("\n");

const textoDoModelo = (f: FichaCartao) =>
  [
    `Produto: ${f.produto} (${f.tipo}) · Formato: ${f.formato} · Gatilho do gancho: ${f.gatilho.slug}`,
    ...PARTES.map((p) => textoDaParte(p.rotulo, f[p.chave])),
  ].join("\n");

/**
 * Bloco que vai DEPOIS do dossiê no prompt do gerador (o prefixo cacheado não muda): a lista de
 * gatilhos (sempre) e as fichas ≥ LIMIAR_MODELO como modelo de raciocínio.
 */
export function blocoDasFichas(fichas: FichaCartao[], gatilhos: Gatilho[]): string {
  const lista = gatilhos.length
    ? `\n\nGATILHOS (use no campo "gatilho" exatamente um destes slugs): ${gatilhos.map((g) => g.slug).join(", ")}`
    : "";
  const modelos = fichas.filter((f) => (f.similaridade ?? 0) >= LIMIAR_MODELO);
  if (!modelos.length) return lista;
  return `${lista}\n\nROTEIROS DA ESPECIALISTA PARA PRODUTOS PARECIDOS — pense como ela: o gatilho, o porquê de cada escolha, a entonação e a estrutura. Não explique as escolhas no roteiro; só escreva como ela escreveria.\n\n${modelos.map(textoDoModelo).join("\n\n")}`;
}
