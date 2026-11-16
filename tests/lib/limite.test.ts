import { describe, expect, it } from "vitest";
import {
  AVISO_COM_RESTANTES,
  inicioDoDiaSP,
  limiteSemanal,
  mensagemDeCreditos,
  saldoDeCreditos,
  usoPorAcao,
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
  it("conta criada até 30/11 às 23h59 de Brasília: 20 perguntas e 15 roteiros, para sempre", () => {
    expect(limiteSemanal("2026-11-04T12:00:00Z")).toEqual({ assistente: 20, roteiro: 15 });
    expect(limiteSemanal("2026-12-01T02:59:59Z")).toEqual({ assistente: 20, roteiro: 15 });
  });
  it("conta criada a partir de 1/12 0h de Brasília: 15 perguntas e 10 roteiros", () => {
    expect(limiteSemanal("2026-12-01T03:00:00Z")).toEqual({ assistente: 15, roteiro: 10 });
    expect(limiteSemanal("2027-03-01T00:00:00Z")).toEqual({ assistente: 15, roteiro: 10 });
  });
  it("sem data de criação: o limite menor", () => {
    expect(limiteSemanal(undefined)).toEqual({ assistente: 15, roteiro: 10 });
    expect(limiteSemanal("lixo")).toEqual({ assistente: 15, roteiro: 10 });
  });
  it("aviso perto do fim", () => {
    expect(AVISO_COM_RESTANTES).toEqual({ assistente: 4, roteiro: 2 });
  });
});

describe("mensagemDeCreditos", () => {
  it("escondida enquanto sobra bastante", () => {
    expect(mensagemDeCreditos("assistente", 15, 20)).toBeNull();
    expect(mensagemDeCreditos("assistente", 5, 20)).toBeNull();
    expect(mensagemDeCreditos("roteiro", 3, 15)).toBeNull();
  });
  it("perto do fim, diz quanto resta de cada tipo", () => {
    expect(mensagemDeCreditos("assistente", 4, 20)).toBe("Restam 4 perguntas nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos("assistente", 1, 20)).toBe("Resta 1 pergunta nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos("roteiro", 2, 15)).toBe("Restam 2 roteiros nesta semana. Renova no domingo.");
    expect(mensagemDeCreditos("roteiro", 1, 15)).toBe("Resta 1 roteiro nesta semana. Renova no domingo.");
  });
  it("acabou", () => {
    expect(semCreditos(1)).toBe(false);
    expect(semCreditos(0)).toBe(true);
    expect(mensagemDeCreditos("assistente", 0, 20)).toBe("Suas 20 perguntas da semana acabaram. Domingo tem mais.");
    expect(mensagemDeCreditos("roteiro", 0, 10)).toBe("Seus 10 roteiros da semana acabaram. Domingo tem mais.");
  });
});

describe("cartão de créditos", () => {
  it("diz quanto cada ação gasta", () => {
    expect(usoPorAcao("assistente")).toBe("Cada pergunta usa 1 crédito.");
    expect(usoPorAcao("roteiro")).toBe("Cada roteiro usa 1 crédito.");
  });
  it("diz quanto ainda resta na semana", () => {
    expect(saldoDeCreditos(12)).toBe("Você ainda tem 12 créditos nesta semana.");
    expect(saldoDeCreditos(1)).toBe("Você ainda tem 1 crédito nesta semana.");
  });
});
