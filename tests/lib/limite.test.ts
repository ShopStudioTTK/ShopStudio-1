import { describe, expect, it } from "vitest";
import {
  AVISO_COM_RESTANTES,
  CREDITOS_POR_SEMANA,
  inicioDoDiaSP,
  mensagemDeCreditos,
  precoEmCreditos,
  semanaSP,
  semCreditos,
} from "@/lib/limite";

describe("inicioDoDiaSP", () => {
  it("meia-noite de Brasília é 03:00 UTC", () => {
    expect(inicioDoDiaSP(new Date("2026-11-05T15:00:00Z")).toISOString()).toBe("2026-11-05T03:00:00.000Z");
  });
  it("às 01:00 UTC ainda é o dia anterior em Brasília", () => {
    expect(inicioDoDiaSP(new Date("2026-11-05T01:00:00Z")).toISOString()).toBe("2026-11-04T03:00:00.000Z");
  });
});

describe("semanaSP", () => {
  it("a semana é o domingo em que ela começou, em Brasília", () => {
    // quarta-feira
    expect(semanaSP(new Date("2026-11-11T15:00:00Z"))).toBe("2026-11-08");
  });
  it("domingo 0h em Brasília já é a semana nova", () => {
    expect(semanaSP(new Date("2026-11-15T03:00:00Z"))).toBe("2026-11-15");
  });
  it("sábado 23h59 em Brasília (domingo 02:59 UTC) ainda é a semana anterior", () => {
    expect(semanaSP(new Date("2026-11-15T02:59:00Z"))).toBe("2026-11-08");
  });
});

describe("precoEmCreditos", () => {
  it("pergunta: 1 até 600 tokens, +0,5 a cada 600 a mais, teto de 2", () => {
    expect(precoEmCreditos("assistente", 280)).toBe(1);
    expect(precoEmCreditos("assistente", 600)).toBe(1);
    expect(precoEmCreditos("assistente", 601)).toBe(1.5);
    expect(precoEmCreditos("assistente", 1200)).toBe(1.5);
    expect(precoEmCreditos("assistente", 1201)).toBe(2);
    expect(precoEmCreditos("assistente", 4000)).toBe(2);
  });
  it("roteiro: 1 até 2.000 tokens, +0,5 a cada 1.000 a mais, teto de 2", () => {
    expect(precoEmCreditos("roteiro", 1500)).toBe(1);
    expect(precoEmCreditos("roteiro", 2000)).toBe(1);
    expect(precoEmCreditos("roteiro", 2410)).toBe(1.5);
    expect(precoEmCreditos("roteiro", 3001)).toBe(2);
    expect(precoEmCreditos("roteiro", 9000)).toBe(2);
  });
  it("sem a contagem de tokens, cobra 1", () => {
    expect(precoEmCreditos("assistente", undefined)).toBe(1);
    expect(precoEmCreditos("roteiro", null)).toBe(1);
  });
});

describe("mensagemDeCreditos", () => {
  it("40 por semana; escondida enquanto restam mais de 10", () => {
    expect(CREDITOS_POR_SEMANA).toBe(40);
    expect(AVISO_COM_RESTANTES).toBe(10);
    expect(mensagemDeCreditos(40)).toBeNull();
    expect(mensagemDeCreditos(10.5)).toBeNull();
  });
  it("a partir de 10 restantes, mostra o saldo com vírgula", () => {
    expect(mensagemDeCreditos(10)).toBe("Restam 10 créditos nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos(2.5)).toBe("Restam 2,5 créditos nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos(1.5)).toBe("Resta 1,5 crédito nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos(1)).toBe("Resta 1 crédito nesta semana. Renova no domingo.");
  });
  it("abaixo de 1 crédito, acabou (uma ação precisa de pelo menos 1)", () => {
    expect(semCreditos(1)).toBe(false);
    expect(semCreditos(0.5)).toBe(true);
    expect(mensagemDeCreditos(0.5)).toBe("Seus créditos da semana acabaram. Domingo tem mais.");
    expect(mensagemDeCreditos(0)).toBe("Seus créditos da semana acabaram. Domingo tem mais.");
  });
});
