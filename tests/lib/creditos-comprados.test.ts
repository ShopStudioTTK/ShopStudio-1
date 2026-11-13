import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../apoio/db-falso")).adminFalso);

import { naTabela, reiniciarDb, responderCom } from "../apoio/db-falso";
import { creditosRestantes, darCreditos, devolverCredito, reservarChamada, type Reserva } from "@/lib/api-auth";
import { PACOTES, semanaSP } from "@/lib/limite";

beforeEach(() => {
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reservarChamada com créditos comprados", () => {
  it("usa primeiro o crédito da semana, sem tocar nos comprados", async () => {
    responderCom([["insert into public.creditos_semana", [{ gastos: 1 }]], ["insert into public.ai_perguntas", [{ id: "p1" }]]]);
    const r = (await reservarChamada("u1", "assistente", false, "oi")) as Reserva;
    expect(r).toMatchObject({ id: "p1", semana: semanaSP(), lote: null });
    expect(naTabela("creditos_comprados")).toHaveLength(0);
  });

  it("semana esgotada: gasta 1 do lote válido que vence primeiro, da aluna e do tipo", async () => {
    responderCom([["update public.creditos_comprados", [{ id: "L1" }]], ["insert into public.ai_perguntas", [{ id: "p1" }]]]);
    const r = (await reservarChamada("u1", "roteiro", false, "Sérum")) as Reserva;
    expect(r).toMatchObject({ id: "p1", semana: null, lote: "L1" });
    const [c] = naTabela("creditos_comprados");
    expect(c.sql).toContain("vale_ate > now()");
    expect(c.sql).toContain("gastos < quantidade");
    expect(c.sql).toContain("order by vale_ate");
    expect(c.valores).toEqual(["u1", "roteiro"]);
  });

  it("sem semana e sem comprados: 429", async () => {
    const r = await reservarChamada("u1", "assistente", false, "oi");
    expect((r as Response).status).toBe(429);
    expect(naTabela("ai_perguntas")).toHaveLength(0);
  });

  it("admin não toca em crédito nenhum", async () => {
    responderCom([["insert into public.ai_perguntas", [{ id: "p1" }]]]);
    await reservarChamada("u1", "assistente", true, "oi");
    expect(naTabela("creditos_semana")).toHaveLength(0);
    expect(naTabela("creditos_comprados")).toHaveLength(0);
  });
});

describe("devolverCredito", () => {
  it("crédito comprado volta para o lote dele, não para a semana", async () => {
    await devolverCredito({ id: "p1", userId: "u1", rota: "roteiro", semana: null, lote: "L1" });
    expect(naTabela("creditos_semana")).toHaveLength(0);
    const [c] = naTabela("creditos_comprados");
    expect(c.sql).toContain("gastos = greatest(0, gastos - 1)");
    expect(c.valores).toEqual(["L1", "u1"]);
  });
});

describe("creditosRestantes", () => {
  it("semana + comprados válidos, com o vencimento mais próximo", async () => {
    responderCom([
      ["from public.creditos_semana", [{ rota: "assistente", gastos: 15 }]],
      ["from public.creditos_comprados", [{ rota: "assistente", restantes: 8, vence: new Date("2026-12-10T12:00:00Z") }]],
    ]);
    expect(await creditosRestantes("u1")).toEqual({
      restantes: { assistente: 0, roteiro: 7 },
      comprados: { assistente: 8, roteiro: 0 },
      vencimento: "2026-12-10T12:00:00.000Z",
    });
    const [c] = naTabela("creditos_comprados");
    expect(c.sql).toContain("vale_ate > now()");
    expect(c.valores).toEqual(["u1"]);
  });
});

describe("darCreditos", () => {
  it("um lote por tipo, numa consulta só, com validade de 30 dias e a transação", async () => {
    responderCom([["insert into public.creditos_comprados", [{ id: "L1" }, { id: "L2" }]]]);
    expect(await darCreditos("u1", { assistente: 10, roteiro: 5 }, "tx1")).toBe(true);
    const c = naTabela("creditos_comprados");
    expect(c).toHaveLength(1);
    expect(c[0].sql).toContain("interval '30 days'");
    expect(c[0].sql).toContain("where q > 0");
    expect(c[0].sql).toContain("on conflict (transacao, rota) do nothing");
    expect(c[0].valores).toEqual(["u1", "tx1", 10, 5]);
  });
  it("combo: soma as quantidades do pacote em cada categoria", async () => {
    await darCreditos("u1", PACOTES[0], "tx1");
    expect(naTabela("creditos_comprados")[0].valores).toEqual(["u1", "tx1", 10, 20]);
  });
  it("transação repetida: não credita de novo (false)", async () => {
    expect(await darCreditos("u1", PACOTES[0], "tx1")).toBe(false);
  });
  it("quantidade ou transação inválidas não gravam nada", async () => {
    await expect(darCreditos("u1", { assistente: -1, roteiro: 0 }, "tx")).rejects.toThrow();
    await expect(darCreditos("u1", { assistente: 1.5, roteiro: 0 }, "tx")).rejects.toThrow();
    await expect(darCreditos("u1", { assistente: 1, roteiro: 0 }, "")).rejects.toThrow();
    expect(naTabela("creditos_comprados")).toHaveLength(0);
  });
});
