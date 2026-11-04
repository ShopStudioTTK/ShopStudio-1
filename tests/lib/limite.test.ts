import { describe, expect, it } from "vitest";
import { AVISO_A_PARTIR_DE, inicioDoDiaSP, LIMITE_DIARIO, mensagemDeLimite } from "@/lib/limite";

describe("inicioDoDiaSP", () => {
  it("meia-noite de Brasília é 03:00 UTC", () => {
    expect(inicioDoDiaSP(new Date("2026-11-05T15:00:00Z")).toISOString()).toBe("2026-11-05T03:00:00.000Z");
  });
  it("às 01:00 UTC ainda é o dia anterior em Brasília", () => {
    expect(inicioDoDiaSP(new Date("2026-11-05T01:00:00Z")).toISOString()).toBe("2026-11-04T03:00:00.000Z");
  });
});

describe("mensagemDeLimite", () => {
  it("fica escondida antes de 12 perguntas", () => {
    expect(LIMITE_DIARIO).toBe(15);
    expect(AVISO_A_PARTIR_DE).toBe(12);
    expect(mensagemDeLimite(11)).toBeNull();
  });
  it("mostra quantas faltam a partir de 12", () => {
    expect(mensagemDeLimite(12)).toBe("Você ainda pode fazer 3 perguntas hoje.");
    expect(mensagemDeLimite(14)).toBe("Você ainda pode fazer 1 pergunta hoje.");
  });
  it("avisa quando acabou", () => {
    expect(mensagemDeLimite(15)).toBe("Você usou as 15 perguntas de hoje. Amanhã tem mais.");
    expect(mensagemDeLimite(20)).toBe("Você usou as 15 perguntas de hoje. Amanhã tem mais.");
  });
});
