import { describe, expect, it } from "vitest";
import { abreEmPopup, colunasDaGrade, colunasNaTela, porQueAparece, type FichaCartao } from "@/lib/fichas-tipos";

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
  it("a escolha guardada vale de 1 a 6; outra coisa volta ao padrão (4)", () => {
    expect(colunasDaGrade("6")).toBe(6);
    expect(colunasDaGrade("2")).toBe(2);
    for (const v of [null, "", "7", "0", "abc"]) expect(colunasDaGrade(v)).toBe(4);
  });

  it("quantas cabem de verdade na tela: celular 1, tablet até 2, notebook até 3 (4 com a escolha 6), tela larga a escolha", () => {
    expect(colunasNaTela(6, 375)).toBe(1);
    expect(colunasNaTela(6, 800)).toBe(2);
    expect(colunasNaTela(1, 800)).toBe(1);
    expect(colunasNaTela(4, 1100)).toBe(3);
    expect(colunasNaTela(6, 1100)).toBe(4);
    expect(colunasNaTela(2, 1100)).toBe(2);
    expect(colunasNaTela(5, 1440)).toBe(5);
    expect(colunasNaTela(6, 1440)).toBe(6);
  });

  it("pop-up só quando cabem mais de 3 na linha", () => {
    expect(abreEmPopup(4, 1440)).toBe(true);
    expect(abreEmPopup(4, 1100)).toBe(false); // a tela só mostra 3: fica como hoje
    expect(abreEmPopup(6, 1100)).toBe(true); // 4 na linha
    expect(abreEmPopup(3, 1440)).toBe(false);
  });
});
