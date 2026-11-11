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
// Medido com text-embedding-3-small (2026-11-10): o mesmo produto ≈ 0,73–0,75; a mesma categoria ≈ 0,47;
// sem relação 0,1–0,25. A dona subiu os dois em 2026-11-11 (eram 0,45 / 0,55).
export const LIMIAR_CARTAO = 0.7; // aparece no cartão "produtos parecidos": só o mesmo produto
export const LIMIAR_MODELO = 0.8; // entra no prompt do gerador como modelo: só o produto quase igual
export const MAX_CARTAO = 3;
// ponytail: sem paginação; paginar quando a expert passar de algumas centenas de fichas.
const MAX_LISTA = 300;

/**
 * O embedding da ficha leva só o produto e o tipo, não o raciocínio, em minúsculas: o mesmo nome em
 * CAIXA ALTA gera outro vetor e derruba a semelhança. Mudou em 2026-11-11: reindexar as antigas
 * (POST /api/fichas/reindexar).
 */
export const textoDaFicha = (produto: string, tipo: string) => `${produto} — ${tipo}`.toLowerCase();
/** Até quantas fichas marcadas como exemplo fixo entram em todo roteiro. */
const MAX_FIXOS = 6;

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
    ...(l.exemplo_fixo != null && { exemploFixo: Boolean(l.exemplo_fixo) }),
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

/**
 * Cartão 1: fichas de produtos parecidos (≥ LIMIAR_CARTAO). Nunca lança: falha = sem cartão.
 * Sem nenhuma ficha indexada, nem chama o embedding (o cartão é um extra, não vale a espera).
 */
export async function buscarParecidas(produto: string): Promise<FichaCartao[]> {
  try {
    const [{ tem }] = await db()`
      select exists (select 1 from public.fichas_roteiro where embedding is not null) as tem`;
    if (!tem) return [];
    const v = vetorSql(await gerarEmbedding(produto.toLowerCase()));
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

/** Página "Roteiros expert": todas as fichas, as mais novas primeiro, sem nada interno (embedding, autora). */
export async function listarFichas(): Promise<FichaCartao[]> {
  const linhas = await db()`
    select f.id, f.produto, f.tipo, f.formato, f.gancho_gatilho, g.rotulo as gatilho_rotulo,
      f.gancho, f.gancho_porque, f.gancho_entonacao, f.problema, f.problema_porque, f.problema_entonacao,
      f.solucao, f.solucao_porque, f.solucao_entonacao, f.cta, f.cta_porque, f.cta_entonacao
    from public.fichas_roteiro f join public.gatilhos g on g.slug = f.gancho_gatilho
    order by f.criado_em desc
    limit ${MAX_LISTA}`;
  return linhas.map(linhaParaCartao);
}

/** Fichas marcadas pela admin como exemplo fixo de voz: entram em todo roteiro (as mais antigas primeiro). */
export async function listarExemplosFixos(): Promise<FichaCartao[]> {
  const linhas = await db()`
    select f.id, f.produto, f.tipo, f.formato, f.gancho_gatilho, g.rotulo as gatilho_rotulo,
      f.gancho, f.gancho_porque, f.gancho_entonacao, f.problema, f.problema_porque, f.problema_entonacao,
      f.solucao, f.solucao_porque, f.solucao_entonacao, f.cta, f.cta_porque, f.cta_entonacao
    from public.fichas_roteiro f join public.gatilhos g on g.slug = f.gancho_gatilho
    where f.exemplo_fixo
    order by f.criado_em
    limit ${MAX_FIXOS}`;
  return linhas.map(linhaParaCartao);
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
 * gatilhos (sempre), os exemplos fixos de voz (iguais para todas, então seguem no cache) e as fichas
 * ≥ LIMIAR_MODELO como modelo de raciocínio. Uma ficha que já é modelo não se repete nos fixos.
 */
export function blocoDasFichas(fichas: FichaCartao[], gatilhos: Gatilho[], fixas: FichaCartao[] = []): string {
  const lista = gatilhos.length
    ? `\n\nGATILHOS (use no campo "gatilho" exatamente um destes slugs): ${gatilhos.map((g) => g.slug).join(", ")}`
    : "";
  const modelos = fichas.filter((f) => (f.similaridade ?? 0) >= LIMIAR_MODELO);
  const exemplos = fixas.filter((f) => !modelos.some((m) => m.id === f.id));
  const voz = exemplos.length
    ? `\n\nEXEMPLOS DE VOZ DA ANA (roteiros validados por ela, de outros produtos): use como modelo de tom, ritmo e escolha de palavras. Não copie: adapte a lógica para o produto pedido, sem repetir as frases dela. As regras do método têm prioridade sobre estes exemplos (preço, estoque e detalhes do produto só se a aluna informou).\n\n${exemplos.map(textoDoModelo).join("\n\n")}`
    : "";
  if (!modelos.length) return lista + voz;
  return `${lista}${voz}\n\nROTEIROS DA ESPECIALISTA PARA PRODUTOS PARECIDOS — copie a intenção, não o texto. Use o mesmo gatilho e o mesmo raciocínio dela (o porquê de cada escolha, a entonação e a estrutura), aplicados ao produto da aluna. Não repita as frases dela: nenhuma abertura igual (se ela abriu com \"para tudo\", abra de outro jeito), nenhum trecho de 3 palavras seguidas igual, nenhuma expressão marcante dela. Escreva frases novas, com detalhes do produto da aluna. Não explique as escolhas no roteiro.\n\n${modelos.map(textoDoModelo).join("\n\n")}`;
}
