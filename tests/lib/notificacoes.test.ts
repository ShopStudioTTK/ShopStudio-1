import { describe, expect, it } from "vitest";
import { novaNotificacao } from "@/lib/notificacoes";

describe("novaNotificacao", () => {
  it("título e descrição obrigatórios, sem espaços nas pontas", () => {
    expect(novaNotificacao({ titulo: "  Aula nova ", descricao: " Saiu a aula 13. " })).toEqual({
      titulo: "Aula nova",
      descricao: "Saiu a aula 13.",
      link: null,
      linkTexto: null,
    });
    expect(novaNotificacao({ titulo: "", descricao: "x" })).toBe("Escreva o título.");
    expect(novaNotificacao({ titulo: "x", descricao: "  " })).toBe("Escreva a descrição.");
    expect(novaNotificacao(null)).toBe("Escreva o título.");
  });

  it("limites de tamanho", () => {
    expect(novaNotificacao({ titulo: "a".repeat(121), descricao: "x" })).toBe("O título pode ter até 120 caracteres.");
    expect(novaNotificacao({ titulo: "x", descricao: "a".repeat(2001) })).toBe("A descrição pode ter até 2000 caracteres.");
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: "https://a.com", linkTexto: "a".repeat(61) })).toBe(
      "O texto do link pode ter até 60 caracteres.",
    );
  });

  it("link opcional, só https, com texto opcional", () => {
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: "https://shopstudio.app.br/app/capitulos/a", linkTexto: " Ver a aula " })).toMatchObject({
      link: "https://shopstudio.app.br/app/capitulos/a",
      linkTexto: "Ver a aula",
    });
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: "https://a.com" })).toMatchObject({ link: "https://a.com/", linkTexto: null });
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: "http://a.com" })).toBe("O link precisa começar com https://.");
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: "javascript:alert(1)" })).toBe("O link precisa começar com https://.");
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: "não é link" })).toBe("O link precisa começar com https://.");
  });

  it("sem link, o texto do link é ignorado", () => {
    expect(novaNotificacao({ titulo: "x", descricao: "y", link: " ", linkTexto: "Ver" })).toMatchObject({ link: null, linkTexto: null });
  });
});
