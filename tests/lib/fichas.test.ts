import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
const gerarEmbedding = vi.fn();
vi.mock("@/lib/embedding", () => ({ gerarEmbedding: (t: string) => gerarEmbedding(t) }));

import { naTabela, reiniciarDb, responderCom } from "../apoio/db-falso";
import {
  blocoDasFichas,
  buscarDoMesmoJeito,
  buscarParecidas,
  gatilhoDaIa,
  linhaParaCartao,
  listarGatilhos,
  textoDaFicha,
} from "@/lib/fichas";
import type { FichaCartao, Gatilho } from "@/lib/fichas-tipos";

const GATILHOS: Gatilho[] = [
  { slug: "curiosidade", rotulo: "Curiosidade" },
  { slug: "fofoca", rotulo: "Fofoca" },
  { slug: "choque", rotulo: "Choque (quebra de padrão)" },
  { slug: "prova-social", rotulo: "Prova social" },
];

const linha = (o: Record<string, unknown> = {}) => ({
  id: "f1", produto: "Sérum Principia", tipo: "skincare", formato: "Conselho de amiga",
  gancho_gatilho: "fofoca", gatilho_rotulo: "Fofoca",
  gancho: "Ninguém te conta isso", gancho_porque: "skincare vende por segredo", gancho_entonacao: "baixinho, cúmplice",
  problema: "pele opaca", problema_porque: null, problema_entonacao: null,
  solucao: "textura na mão", solucao_porque: "prova visual", solucao_entonacao: "sobe o tom",
  cta: "corre no carrinho", cta_porque: null, cta_entonacao: null,
  ...o,
});
const ficha = (o: Partial<FichaCartao> = {}): FichaCartao => ({ ...linhaParaCartao(linha()), ...o });

beforeEach(() => {
  reiniciarDb();
  gerarEmbedding.mockReset().mockResolvedValue([0.1, 0.2]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("textoDaFicha", () => {
  it("usa só produto e tipo", () => {
    expect(textoDaFicha("Sérum Principia", "skincare")).toBe("Sérum Principia — skincare");
  });
});

describe("linhaParaCartao", () => {
  it("monta as partes e o gatilho, sem embedding nem criado_por", () => {
    const f = linhaParaCartao(linha({ embedding: "[1]", criado_por: "u9", similaridade: "0.8" }));
    expect(f.gatilho).toEqual({ slug: "fofoca", rotulo: "Fofoca" });
    expect(f.gancho).toEqual({ texto: "Ninguém te conta isso", porque: "skincare vende por segredo", entonacao: "baixinho, cúmplice" });
    expect(f.problema).toEqual({ texto: "pele opaca", porque: null, entonacao: null });
    expect(f.similaridade).toBe(0.8);
    expect(JSON.stringify(f)).not.toMatch(/embedding|criado_por|u9/);
  });
});

describe("gatilhoDaIa", () => {
  it.each([
    ["fofoca", "fofoca"],
    ["Fofoca", "fofoca"],
    ["PROVA SOCIAL", "prova-social"],
    ["Prova social", "prova-social"],
    ["Choque (quebra de padrão)", "choque"],
    ["drama", ""],
    [null, ""],
    [42, ""],
  ])("gatilhoDaIa(%j) → %j", (v, esperado) => {
    expect(gatilhoDaIa(v, GATILHOS)).toBe(esperado);
  });
});

describe("listarGatilhos", () => {
  it("lê na ordem de criação", async () => {
    responderCom([["from public.gatilhos", [{ slug: "fofoca", rotulo: "Fofoca" }]]]);
    expect(await listarGatilhos()).toEqual([{ slug: "fofoca", rotulo: "Fofoca" }]);
    expect(naTabela("gatilhos")[0].sql).toMatch(/order by criado_em/);
  });
});

describe("buscarParecidas", () => {
  it("só ≥ 0,6, no máximo 3, embedding do produto da aluna", async () => {
    responderCom([[
      "from public.fichas_roteiro",
      [0.95, 0.8, 0.61, 0.59].map((s, i) => linha({ id: `f${i}`, similaridade: s })),
    ]]);
    expect((await buscarParecidas("sérum")).map((f) => f.similaridade)).toEqual([0.95, 0.8, 0.61]);
    expect(gerarEmbedding).toHaveBeenCalledWith("sérum");
    expect(naTabela("fichas_roteiro")[0].sql).toMatch(/embedding is not null/);
  });

  it("embedding falhou → [] sem lançar", async () => {
    gerarEmbedding.mockRejectedValue(new Error("fora"));
    expect(await buscarParecidas("sérum")).toEqual([]);
  });

  it("banco falhou → [] sem lançar", async () => {
    responderCom([["from public.fichas_roteiro", new Error("db")]]);
    expect(await buscarParecidas("sérum")).toEqual([]);
  });
});

describe("buscarDoMesmoJeito", () => {
  it("formato fora da lista ou gatilho vazio → [] sem consultar o banco", async () => {
    expect(await buscarDoMesmoJeito("Dancinha", "fofoca", [])).toEqual([]);
    expect(await buscarDoMesmoJeito("Unboxing", "", [])).toEqual([]);
    expect(naTabela("fichas_roteiro")).toHaveLength(0);
  });

  it("filtra formato + gatilho, exclui os ids do cartão 1 e limita", async () => {
    responderCom([["from public.fichas_roteiro", [linha({ id: "f2" })]]]);
    const r = await buscarDoMesmoJeito("Unboxing", "fofoca", ["f1"]);
    expect(r.map((f) => f.id)).toEqual(["f2"]);
    const c = naTabela("fichas_roteiro")[0];
    expect(c.valores).toEqual(expect.arrayContaining(["Unboxing", "fofoca", ["f1"]]));
    expect(c.sql).toMatch(/limit/);
  });
});

describe("blocoDasFichas", () => {
  it("lista os slugs dos gatilhos, só fichas ≥ 0,7, e manda não explicar", () => {
    const b = blocoDasFichas(
      [ficha({ similaridade: 0.9 }), ficha({ id: "f2", produto: "Garrafa", similaridade: 0.65 })],
      GATILHOS,
    );
    expect(b).toContain("prova-social");
    expect(b).toContain("skincare vende por segredo");
    expect(b).toContain("baixinho, cúmplice");
    expect(b).not.toContain("Garrafa");
    expect(b).toMatch(/não explique/i);
  });

  it("sem fichas ≥ 0,7, só a lista de gatilhos", () => {
    const b = blocoDasFichas([ficha({ similaridade: 0.65 })], GATILHOS);
    expect(b).toContain("fofoca");
    expect(b).not.toContain("Sérum");
  });
});
