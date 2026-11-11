import { describe, expect, it } from "vitest";
import { destinoSemSessao, larguraDoMenu, MENU_MAX, MENU_MIN, menuCompacto } from "@/lib/navegacao";

describe("destinoSemSessao", () => {
  it("sessão caiu sozinha: guarda a página para voltar depois do login", () => {
    expect(destinoSemSessao("/app/assistente", false)).toBe("/entrar?de=%2Fapp%2Fassistente");
  });

  it("a pessoa clicou em sair: vai para o login limpo, sem levar a próxima conta à página da anterior", () => {
    expect(destinoSemSessao("/app/assistente", true)).toBe("/entrar");
  });
});

describe("larguraDoMenu", () => {
  it("a largura de hoje (272) é o máximo; o mínimo é só os ícones", () => {
    expect(MENU_MAX).toBe(272);
    expect(larguraDoMenu(400)).toBe(MENU_MAX);
    expect(larguraDoMenu(10)).toBe(MENU_MIN);
    expect(larguraDoMenu(200.6)).toBe(201);
  });
  it("valor guardado inválido (vazio, texto, NaN) volta ao máximo", () => {
    for (const v of [null, "", "abc", NaN]) expect(larguraDoMenu(v)).toBe(MENU_MAX);
    expect(larguraDoMenu("150")).toBe(150);
  });
  it("estreito demais para os nomes: só ícones", () => {
    expect(menuCompacto(MENU_MIN)).toBe(true);
    expect(menuCompacto(179)).toBe(true);
    expect(menuCompacto(180)).toBe(false);
  });
});
