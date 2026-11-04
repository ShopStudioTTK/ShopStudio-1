import { describe, expect, it } from "vitest";
import { nomeDoPerfil, primeiroNome } from "@/lib/nome";

describe("nomeDoPerfil", () => {
  it("usa o nome que o Google manda (full_name, depois name)", () => {
    expect(nomeDoPerfil({ full_name: "Ana Luiza Souza", name: "Ana" })).toBe("Ana Luiza Souza");
    expect(nomeDoPerfil({ name: "Ana Luiza" })).toBe("Ana Luiza");
  });
  it("aceita o campo nome dos cadastros antigos e devolve null sem nada", () => {
    expect(nomeDoPerfil({ nome: "Bia" })).toBe("Bia");
    expect(nomeDoPerfil({})).toBeNull();
    expect(nomeDoPerfil(undefined)).toBeNull();
  });
});

describe("primeiroNome", () => {
  it("primeiro nome do perfil, senão o começo do e-mail", () => {
    expect(primeiroNome({ full_name: "Ana Luiza Souza" }, "ana@gmail.com")).toBe("Ana");
    expect(primeiroNome({}, "bia.lima@gmail.com")).toBe("bia.lima");
    expect(primeiroNome(undefined, undefined)).toBe("");
  });
});
