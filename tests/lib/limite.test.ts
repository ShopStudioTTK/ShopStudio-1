import { describe, expect, it } from "vitest";
import {
  AVISO_COM_RESTANTES,
  LIMITE_SEMANAL,
  PACOTES,
  PRECO_AVULSO,
  inicioDoDiaSP,
  precoDoPacote,
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

describe("mensagemDeCreditos com créditos comprados", () => {
  it("conta os comprados no total e avisa só perto do fim", () => {
    expect(mensagemDeCreditos("assistente", 0, 10)).toBeNull();
    expect(mensagemDeCreditos("assistente", 1, 2)).toBe("Restam 3 perguntas, contando as compradas.");
    expect(mensagemDeCreditos("roteiro", 0, 1)).toBe("Resta 1 roteiro, contando os comprados.");
  });
  it("semana e comprados no zero: acabou", () => {
    expect(mensagemDeCreditos("assistente", 0, 0)).toBe("Suas 15 perguntas da semana acabaram. Domingo tem mais.");
  });
});

describe("pacotes de créditos", () => {
  it("valor unitário: R$ 0,70 por pergunta e R$ 1,60 por roteiro", () => {
    expect(PRECO_AVULSO).toEqual({ assistente: 0.7, roteiro: 1.6 });
  });
  it("na ordem da vitrine: Combo Pro, Combo Criador, roteiros, perguntas", () => {
    expect(PACOTES.map((p) => [p.id, p.assistente, p.roteiro, p.preco])).toEqual([
      ["combo-pro", 10, 20, 29.9],
      ["combo-criador", 5, 10, 17.9],
      ["roteiros-5", 0, 5, 8],
      ["perguntas-10", 10, 0, 7],
    ]);
  });
  it("selos só nos combos", () => {
    expect(PACOTES.map((p) => p.selo ?? null)).toEqual(["Melhor custo-benefício", "Mais vendido", null, null]);
  });
  it("o \"de\" sai dos valores unitários, em centavos redondos", () => {
    const [pro, criador, roteiros, perguntas] = PACOTES.map(precoDoPacote);
    expect(pro).toEqual({ cheio: 39, preco: 29.9 });
    expect(criador).toEqual({ cheio: 19.5, preco: 17.9 });
    expect(roteiros).toEqual({ cheio: 8, preco: 8 });
    expect(perguntas).toEqual({ cheio: 7, preco: 7 });
  });
  it("combo nunca custa mais que o avulso; avulso custa exatamente o unitário", () => {
    for (const p of PACOTES) {
      const { cheio, preco } = precoDoPacote(p);
      const combo = p.assistente > 0 && p.roteiro > 0;
      expect(combo ? preco < cheio : preco === cheio).toBe(true);
    }
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
  it("com comprados, soma e mostra de onde vem", () => {
    expect(saldoDeCreditos(2, 10)).toBe("Você ainda tem 12 créditos: 2 da semana e 10 comprados.");
    expect(saldoDeCreditos(0, 1)).toBe("Você ainda tem 1 crédito: 0 da semana e 1 comprado.");
  });
});
