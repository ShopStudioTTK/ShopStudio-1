import { describe, expect, it } from "vitest";
import { escolherExemplos, frasesDaIa, linhasDaPlanilha, normalizar, tiposDoBanco, type ExemploDeMusica } from "@/lib/frases-musica";

const ex = (o: Partial<ExemploDeMusica> = {}): ExemploDeMusica => ({
  categoria: "Pijama e Camisola", produto: "Pijama americano", frase: "pov: dormir cheirosa", tipo: "POV identidade", cena: "Pijama na cama", ...o,
});

describe("linhasDaPlanilha", () => {
  it("lê as 5 colunas separadas por TAB e pula o cabeçalho", () => {
    const t = "Categoria\tProduto\tFrase na tela\tTipo de frase\tCena sugerida\nPijama\tPijama americano\tpov: cheirosa 🎀\tPOV identidade\tNa cama";
    expect(linhasDaPlanilha(t)).toEqual([
      { linha: 2, ok: true, exemplo: { categoria: "Pijama", produto: "Pijama americano", frase: "pov: cheirosa 🎀", tipo: "POV identidade", cena: "Na cama" } },
    ]);
  });
  it("tira aspas da célula e ignora linhas vazias (CRLF do Excel)", () => {
    const [l] = linhasDaPlanilha('\r\n"A"\t"B"\t"frase, com vírgula"\tT\tC\r\n');
    expect(l).toMatchObject({ ok: true, exemplo: { categoria: "A", frase: "frase, com vírgula" } });
  });
  it("recusa com o motivo: colunas faltando, coluna vazia, coluna grande", () => {
    const r = linhasDaPlanilha(["a\tb\tc", "a\t\tc\td\te", `a\tb\t${"x".repeat(201)}\td\te`].join("\n"));
    expect(r.map((l) => (l.ok ? "ok" : l.motivo))).toEqual([
      expect.stringContaining("faltam colunas"),
      'coluna "produto" vazia',
      'coluna "frase" passa de 200 caracteres',
    ]);
    expect(r.map((l) => l.linha)).toEqual([1, 2, 3]);
  });
});

describe("escolherExemplos", () => {
  const banco = [
    ex({ produto: "Toalha de banho", categoria: "Casa", tipo: "Humor", frase: "1" }),
    ex({ produto: "Pijama de cetim", tipo: "Fofoca", frase: "2" }),
    ex({ produto: "Pijama americano", tipo: "POV identidade", frase: "3" }),
    ex({ produto: "Tapete", categoria: "Casa", tipo: "Humor", frase: "4" }),
  ];
  it("produto parecido primeiro, depois um de cada tipo que faltou", () => {
    expect(escolherExemplos(banco, "pijama", 3).map((e) => e.frase)).toEqual(["2", "3", "1"]);
  });
  it("sem parecido, ainda mostra a variedade de tipos e completa até o máximo", () => {
    expect(escolherExemplos(banco, "garrafa", 4).map((e) => e.frase)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("frasesDaIa", () => {
  it("só as completas, cortadas no tamanho, no máximo 5", () => {
    const v = [{ frase: " a ", tipo: "T", cena: " c " }, { frase: "sem cena" }, null, ...Array(6).fill({ frase: "x", cena: "y" })];
    const r = frasesDaIa(v);
    expect(r[0]).toEqual({ frase: "a", tipo: "T", cena: "c" });
    expect(r).toHaveLength(5);
  });
  it("não-lista → vazio", () => expect(frasesDaIa({ frase: "a" })).toEqual([]));
});

it("normalizar e tiposDoBanco ignoram acento e caixa", () => {
  expect(normalizar("Provocação!")).toBe("provocacao");
  expect(tiposDoBanco([ex({ tipo: "Provocação" }), ex({ tipo: "provocacao" }), ex({ tipo: "Humor" })])).toEqual(["Provocação", "Humor"]);
});
