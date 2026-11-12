import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { GET } from "@/app/api/pedidos/route";

const ID = "11111111-2222-3333-4444-555555555555";
const req = (id = ID) => new Request(`http://x/api/pedidos?id=${id}`, { headers: { Authorization: "Bearer tok" } });
const linha = (o: Record<string, unknown>) => responderCom([["from public.ai_perguntas", [{ resultado: null, vencido: false, ...o }]]]);

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/pedidos (retomar depois do F5)", () => {
  it("400 sem id válido, sem tocar na tabela", async () => {
    expect((await GET(req("nao-e-uuid"))).status).toBe(400);
    expect(naTabela("ai_perguntas")).toHaveLength(0);
  });

  it("procura o pedido só entre os da aluna logada", async () => {
    await GET(req());
    expect(naTabela("ai_perguntas")[0].sql).toContain("where user_id = ? and pedido = ?");
    expect(naTabela("ai_perguntas")[0].valores).toEqual(["u1", ID]);
  });

  it("404 quando o pedido não existe (não chegou ao servidor ou a IA nem respondeu)", async () => {
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it("202 enquanto a IA ainda escreve", async () => {
    linha({});
    const res = await GET(req());
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ pendente: true });
  });

  it("504 se passou do tempo e não ficou pronto (a função caiu)", async () => {
    linha({ vencido: true });
    expect((await GET(req())).status).toBe(504);
  });

  it("devolve o que a rota de IA teria devolvido: status e corpo", async () => {
    linha({ resultado: { status: 200, corpo: { ganchos: ["a"] } } });
    let res = await GET(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ganchos: ["a"] });

    linha({ resultado: { status: 502, corpo: { error: { message: "cortada" } } }, vencido: true });
    res = await GET(req());
    expect(res.status).toBe(502);
    expect((await res.json()).error.message).toBe("cortada");
  });

  it("500 se o banco falhar", async () => {
    responderCom([["from public.ai_perguntas", new Error("db")]]);
    expect((await GET(req())).status).toBe(500);
  });
});
