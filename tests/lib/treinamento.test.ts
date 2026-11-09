import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../apoio/db-falso");
  return { db: () => b.sqlFalso };
});

import { naTabela, reiniciarDb } from "../apoio/db-falso";
import { blocoDaExpert, buscarRespostasDaExpert, textoParaEmbedding } from "@/lib/treinamento";

const r = (similaridade: number, n: number) => ({ pergunta: `P${n}`, resposta: `R${n}`, similaridade });

beforeEach(() => reiniciarDb());

describe("textoParaEmbedding", () => {
  it("sem contexto, a pergunta igual", () => {
    expect(textoParaEmbedding([], "p")).toBe("p");
  });

  it("usa só as 2 últimas perguntas anteriores", () => {
    const t = textoParaEmbedding(["aaa", "bbb", "ccc"], "p");
    expect(t).toContain("bbb");
    expect(t).toContain("ccc");
    expect(t).not.toContain("aaa");
    expect(t.endsWith("Pergunta: p")).toBe(true);
  });
});

describe("blocoDaExpert", () => {
  it("nada abaixo de 0,7", () => {
    expect(blocoDaExpert([])).toBe("");
    expect(blocoDaExpert([r(0.65, 1)])).toBe("");
  });

  it("≥ 0,9: só a resposta dela, para repetir quase palavra por palavra", () => {
    const b = blocoDaExpert([r(0.95, 1), r(0.8, 2)]);
    expect(b).toContain("JÁ RESPONDEU");
    expect(b).toContain("R1");
    expect(b).not.toContain("R2");
  });

  it("entre 0,7 e 0,9: as parecidas como modelo", () => {
    const b = blocoDaExpert([r(0.85, 1), r(0.75, 2), r(0.5, 3)]);
    expect(b).toContain("PARECIDAS");
    expect(b).toContain("R1");
    expect(b).toContain("R2");
    expect(b).not.toContain("R3");
  });
});

describe("buscarRespostasDaExpert", () => {
  it("só respondidas, as 4 mais próximas, com o vetor como parâmetro", async () => {
    await buscarRespostasDaExpert([0.1, 0.2]);
    const [c] = naTabela("treinamento");
    expect(c.sql).toContain("status = 'respondida'");
    expect(c.sql).toContain("embedding is not null");
    expect(c.valores).toContain("[0.1,0.2]");
    expect(c.valores).toContain(4);
  });
});
