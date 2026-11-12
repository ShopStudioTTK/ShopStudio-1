/**
 * Música viral (sem fala), 2026-11-12: lógica pura, sem banco nem IA (testável e usável na tela).
 * A aluna recebe frases de tela, cada uma com o tipo da frase e uma cena simples para gravar.
 * Os exemplos vêm só do banco `frases_musica` (planilha da especialista), nunca das fichas faladas.
 */

export type FraseDeMusica = { frase: string; tipo: string; cena: string };
export type ExemploDeMusica = FraseDeMusica & { categoria: string; produto: string };

export const LIMITES = { categoria: 80, produto: 120, frase: 200, tipo: 60, cena: 300 } as const;
/** Quantas frases o gerador devolve por vez (1 crédito). */
export const FRASES_POR_VEZ = 5;
/** Quantos exemplos da especialista vão no prompt. */
export const EXEMPLOS_NO_PROMPT = 24;

const COLUNAS = ["categoria", "produto", "frase", "tipo", "cena"] as const;

/** Minúsculas, sem acento e sem pontuação: para comparar produto com produto. */
export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const palavras = (s: string) => new Set(normalizar(s).split(" ").filter((p) => p.length >= 3));

const ehCabecalho = (celulas: string[]) => normalizar(celulas[0] ?? "") === "categoria";

export type LinhaLida = { linha: number } & ({ ok: true; exemplo: ExemploDeMusica } | { ok: false; motivo: string });

/**
 * Linhas copiadas da planilha (Google Sheets e Excel colam com TAB entre as colunas), na ordem
 * Categoria · Produto · Frase na tela · Tipo de frase · Cena sugerida. O cabeçalho é pulado.
 * Cada linha volta lida ou com o motivo da recusa, com o número da linha colada (a partir de 1).
 */
export function linhasDaPlanilha(texto: string): LinhaLida[] {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  const lidas: LinhaLida[] = [];
  linhas.forEach((bruta, i) => {
    if (!bruta.trim()) return;
    const celulas = bruta.split("\t").map((c) => c.trim().replace(/^"(.*)"$/s, "$1").trim());
    if (i === 0 && ehCabecalho(celulas)) return;
    const linha = i + 1;
    if (celulas.length < COLUNAS.length) {
      lidas.push({ linha, ok: false, motivo: "faltam colunas (precisa de 5, separadas por TAB)" });
      return;
    }
    const [categoria, produto, frase, tipo, cena] = celulas;
    const vazia = COLUNAS.find((c, k) => !celulas[k]);
    if (vazia) {
      lidas.push({ linha, ok: false, motivo: `coluna "${vazia}" vazia` });
      return;
    }
    const grande = COLUNAS.find((c, k) => celulas[k].length > LIMITES[c]);
    if (grande) {
      lidas.push({ linha, ok: false, motivo: `coluna "${grande}" passa de ${LIMITES[grande]} caracteres` });
      return;
    }
    lidas.push({ linha, ok: true, exemplo: { categoria, produto, frase, tipo, cena } });
  });
  return lidas;
}

/**
 * Exemplos para o prompt: primeiro os de produto parecido com o da aluna (palavras em comum no
 * produto ou na categoria), depois um de cada tipo de frase que ainda não apareceu, para a IA ver
 * a variedade. Ordem estável para o mesmo banco e o mesmo produto.
 */
export function escolherExemplos(banco: ExemploDeMusica[], produto: string, max = EXEMPLOS_NO_PROMPT): ExemploDeMusica[] {
  const alvo = palavras(produto);
  const pontuados = banco.map((e, i) => {
    const doProduto = palavras(e.produto);
    const daCategoria = palavras(e.categoria);
    let pontos = 0;
    for (const p of alvo) {
      if (doProduto.has(p)) pontos += 2;
      else if (daCategoria.has(p)) pontos += 1;
    }
    return { e, i, pontos };
  });

  const escolhidos: ExemploDeMusica[] = [];
  const usados = new Set<number>();
  const parecidos = pontuados.filter((p) => p.pontos > 0).sort((a, b) => b.pontos - a.pontos || a.i - b.i);
  for (const p of parecidos.slice(0, Math.ceil(max / 2))) {
    escolhidos.push(p.e);
    usados.add(p.i);
  }
  const tipos = new Set(escolhidos.map((e) => normalizar(e.tipo)));
  for (const p of pontuados) {
    if (escolhidos.length >= max) break;
    if (usados.has(p.i) || tipos.has(normalizar(p.e.tipo))) continue;
    escolhidos.push(p.e);
    usados.add(p.i);
    tipos.add(normalizar(p.e.tipo));
  }
  for (const p of pontuados) {
    if (escolhidos.length >= max) break;
    if (usados.has(p.i)) continue;
    escolhidos.push(p.e);
    usados.add(p.i);
  }
  return escolhidos;
}

/** Tipos de frase do banco, sem repetir, na ordem em que aparecem. */
export const tiposDoBanco = (banco: ExemploDeMusica[]) => {
  const vistos = new Map<string, string>();
  for (const e of banco) if (!vistos.has(normalizar(e.tipo))) vistos.set(normalizar(e.tipo), e.tipo);
  return [...vistos.values()];
};

const textoCurto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Frases que a IA devolveu, conferidas: só as completas, no máximo FRASES_POR_VEZ. */
export function frasesDaIa(v: unknown): FraseDeMusica[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        frase: textoCurto(o.frase, LIMITES.frase),
        tipo: textoCurto(o.tipo, LIMITES.tipo),
        cena: textoCurto(o.cena, LIMITES.cena),
      };
    })
    .filter((f) => f.frase && f.cena)
    .slice(0, FRASES_POR_VEZ);
}
