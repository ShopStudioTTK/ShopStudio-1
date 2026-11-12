import { describe, expect, it } from "vitest";
import {
  AVISO_COM_RESTANTES,
  LIMITE_SEMANAL,
  inicioDoDiaSP,
  mensagemDeCreditos,
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

describe("limites semanais", () => {
  it("15 perguntas e 7 roteiros por semana, saldos separados; cada pedido gasta 1", () => {
    expect(LIMITE_SEMANAL).toEqual({ assistente: 15, roteiro: 7 });
    expect(AVISO_COM_RESTANTES).toEqual({ assistente: 4, roteiro: 2 });
  });
});

describe("mensagemDeCreditos", () => {
  it("escondida enquanto sobra bastante", () => {
    expect(mensagemDeCreditos("assistente", 15)).toBeNull();
    expect(mensagemDeCreditos("assistente", 5)).toBeNull();
    expect(mensagemDeCreditos("roteiro", 3)).toBeNull();
  });
  it("perto do fim, diz quanto resta de cada tipo", () => {
    expect(mensagemDeCreditos("assistente", 4)).toBe("Restam 4 perguntas nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos("assistente", 1)).toBe("Resta 1 pergunta nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos("roteiro", 2)).toBe("Restam 2 roteiros nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos("roteiro", 1)).toBe("Resta 1 roteiro nesta semana. Renova no domingo.");
  });
  it("acabou", () => {
    expect(semCreditos(1)).toBe(false);
    expect(semCreditos(0)).toBe(true);
    expect(mensagemDeCreditos("assistente", 0)).toBe("Suas 15 perguntas da semana acabaram. Domingo tem mais.");
    expect(mensagemDeCreditos("roteiro", 0)).toBe("Seus 7 roteiros da semana acabaram. Domingo tem mais.");
  });
});
