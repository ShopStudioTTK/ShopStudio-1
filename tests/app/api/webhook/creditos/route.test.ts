import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../../apoio/db-falso")).adminFalso);

import { consultas, naTabela, reiniciarDb, responderCom } from "../../../../apoio/db-falso";
import { POST } from "@/app/api/webhook/creditos/route";

const SEGREDO = "segredo-dos-creditos";
const req = (body: unknown, auth: string | null = `Bearer ${SEGREDO}`) =>
  new Request("http://x/api/webhook/creditos", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
const COMPRA = { email: "  Aluna@X.com ", pacote: "combo-pro", transacao: "tx-1" };
const msg = async (res: Response) => (await res.json()).error.message;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("WEBHOOK_CREDITOS_SEGREDO", SEGREDO);
  vi.spyOn(console, "error").mockImplementation(() => {});
  reiniciarDb();
  responderCom([
    ["from auth.users", [{ id: "u1" }]],
    ["insert into public.creditos_comprados", [{ id: "L1" }, { id: "L2" }]],
    ["from public.creditos_semana", [{ rota: "roteiro", gastos: 2 }]],
    ["from public.creditos_comprados", [
      { rota: "assistente", restantes: 10, vence: new Date("2026-12-12T12:00:00Z") },
      { rota: "roteiro", restantes: 20, vence: new Date("2026-12-12T12:00:00Z") },
    ]],
  ]);
});

describe("POST /api/webhook/creditos", () => {
  it("credita o pacote e devolve quantos créditos a aluna tem agora", async () => {
    const res = await POST(req(COMPRA));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      email: "aluna@x.com",
      pacote: "combo-pro",
      creditado: true,
      creditos: {
        restantes: { assistente: 15, roteiro: 5 },
        comprados: { assistente: 10, roteiro: 20 },
        vencimento: "2026-12-12T12:00:00.000Z",
      },
    });
    expect(consultas.find((c) => c.sql.includes("from auth.users"))?.valores).toEqual(["aluna@x.com"]);
    expect(naTabela("creditos_comprados")[0].valores).toEqual(["u1", "tx-1", 10, 20]);
  });

  it("transação repetida: 200, não credita de novo e devolve o saldo", async () => {
    responderCom([["from auth.users", [{ id: "u1" }]]]);
    const res = await POST(req(COMPRA));
    expect(res.status).toBe(200);
    expect((await res.json()).creditado).toBe(false);
  });

  it("sem segredo configurado → 500, sem tocar no banco", async () => {
    vi.stubEnv("WEBHOOK_CREDITOS_SEGREDO", "");
    expect((await POST(req(COMPRA))).status).toBe(500);
    expect(consultas).toHaveLength(0);
  });

  it.each([null, "Bearer errado", `Bearer ${SEGREDO}x`, SEGREDO])("segredo %s → 401, sem tocar no banco", async (auth) => {
    expect((await POST(req(COMPRA, auth))).status).toBe(401);
    expect(consultas).toHaveLength(0);
  });

  it.each([
    [{ ...COMPRA, email: "nao-e-email" }, "E-mail inválido."],
    [{ ...COMPRA, pacote: "combo-gratis" }, "Pacote desconhecido."],
    [{ ...COMPRA, transacao: "" }, "Falta o id da transação."],
    [{ ...COMPRA, transacao: "x".repeat(201) }, "Falta o id da transação."],
  ])("pedido inválido → 400 (%o)", async (body, mensagem) => {
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    expect(await msg(res)).toBe(mensagem);
    expect(consultas).toHaveLength(0);
  });

  it("aluna sem conta → 404, nada creditado", async () => {
    responderCom([]);
    const res = await POST(req(COMPRA));
    expect(res.status).toBe(404);
    expect(naTabela("creditos_comprados")).toHaveLength(0);
  });

  it("banco falhou → 500", async () => {
    responderCom([["from auth.users", new Error("caiu")]]);
    expect((await POST(req(COMPRA))).status).toBe(500);
  });
});
