import { describe, expect, it } from "vitest";
import { porQueAparece, type FichaCartao } from "@/lib/fichas-tipos";

const parte = { texto: "t", porque: null, entonacao: null };
const ficha = (o: Partial<FichaCartao> = {}): FichaCartao => ({
  id: "f1", produto: "Sérum", tipo: "skincare", formato: "Unboxing", gatilho: { slug: "fofoca", rotulo: "Fofoca" },
  gancho: parte, problema: parte, solucao: parte, cta: parte, ...o,
});

describe("porQueAparece", () => {
  it("diz o que bate com o roteiro da aluna: produto (com %), formato e gatilho", () => {
    expect(porQueAparece(ficha({ similaridade: 0.784 }), "Unboxing", "fofoca")).toEqual([
      "Produto 78% parecido",
      "Mesmo formato · Unboxing",
      "Mesmo gatilho · Fofoca",
    ]);
  });

  it("só o que bate: sem semelhança calculada, outro formato, outro gatilho", () => {
    expect(porQueAparece(ficha(), "Tela verde", "choque")).toEqual([]);
    expect(porQueAparece(ficha(), "Unboxing", "")).toEqual(["Mesmo formato · Unboxing"]);
  });
});
