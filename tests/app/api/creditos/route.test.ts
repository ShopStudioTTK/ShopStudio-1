import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { GET } from "@/app/api/creditos/route";
import { semanaSP } from "@/lib/limite";

const req = () => new Request("http://x/api/creditos", { headers: { Authorization: "Bearer tok" } });

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/creditos", () => {
  it("devolve quanto resta de cada tipo na semana da aluna logada", async () => {
    responderCom([
      ["from public.entitlements", [{}]],
      ["from public.creditos_semana", [{ rota: "assistente", gastos: 11 }, { rota: "roteiro", gastos: 2 }]],
    ]);
    expect(await (await GET(req())).json()).toEqual({
      restantes: { assistente: 4, roteiro: 8 },
      limite: { assistente: 15, roteiro: 10 },
    });
    const leitura = naTabela("creditos_semana")[0];
    expect(leitura.valores).toEqual(["u1", semanaSP()]);
  });

  it("conta nova (a partir de dezembro), semana sem uso = 15 perguntas e 10 roteiros", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", created_at: "2026-12-02T10:00:00Z" } }, error: null });
    responderCom([["from public.entitlements", [{}]]]);
    expect((await (await GET(req())).json()).restantes).toEqual({ assistente: 15, roteiro: 10 });
  });

  it("conta de antes de dezembro: 20 perguntas e 15 roteiros", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", created_at: "2026-11-10T10:00:00Z" } }, error: null });
    responderCom([["from public.entitlements", [{}]], ["from public.creditos_semana", [{ rota: "roteiro", gastos: 3 }]]]);
    expect(await (await GET(req())).json()).toEqual({
      restantes: { assistente: 20, roteiro: 12 },
      limite: { assistente: 20, roteiro: 15 },
    });
  });

  it("admin: ilimitado, sem ler créditos", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]]]);
    expect(await (await GET(req())).json()).toEqual({ ilimitado: true });
    expect(naTabela("creditos_semana")).toHaveLength(0);
  });

  it("500 se o banco falhar", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.creditos_semana", new Error("x")]]);
    expect((await GET(req())).status).toBe(500);
  });
});
