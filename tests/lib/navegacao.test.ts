import { describe, expect, it } from "vitest";
import { destinoSemSessao } from "@/lib/navegacao";

describe("destinoSemSessao", () => {
  it("sessão caiu sozinha: guarda a página para voltar depois do login", () => {
    expect(destinoSemSessao("/app/assistente", false)).toBe("/entrar?de=%2Fapp%2Fassistente");
  });

  it("a pessoa clicou em sair: vai para o login limpo, sem levar a próxima conta à página da anterior", () => {
    expect(destinoSemSessao("/app/assistente", true)).toBe("/entrar");
  });
});
