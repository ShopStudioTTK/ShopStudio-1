import { describe, expect, it } from "vitest";
import { abreEmPopup, colunasDaGrade, porQueAparece, type FichaCartao } from "@/lib/fichas-tipos";

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

describe("grade da página Roteiros expert", () => {
  it("a escolha guardada vale de 1 a 4; outra coisa volta ao padrão (4)", () => {
    expect(colunasDaGrade("2")).toBe(2);
    for (const v of [null, "", "5", "0", "abc"]) expect(colunasDaGrade(v)).toBe(4);
  });

  it("pop-up só quando cabem mais de 3 na linha: escolheu 4 e a tela é larga", () => {
    expect(abreEmPopup(4, true)).toBe(true);
    expect(abreEmPopup(4, false)).toBe(false); // a tela só mostra 3: fica como hoje
    expect(abreEmPopup(3, true)).toBe(false);
  });
});
