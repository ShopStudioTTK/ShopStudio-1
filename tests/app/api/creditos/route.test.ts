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
      restantes: { assistente: 4, roteiro: 5 },
      comprados: { assistente: 0, roteiro: 0 },
      vencimento: null,
    });
    const leitura = naTabela("creditos_semana")[0];
    expect(leitura.valores).toEqual(["u1", semanaSP()]);
  });

  it("semana sem uso = 15 perguntas e 7 roteiros", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    expect(await (await GET(req())).json()).toEqual({
      restantes: { assistente: 15, roteiro: 7 },
      comprados: { assistente: 0, roteiro: 0 },
      vencimento: null,
    });
  });

  it("admin: ilimitado, sem ler créditos", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]]]);
    expect(await (await GET(req())).json()).toEqual({ ilimitado: true });
    expect(naTabela("creditos_semana")).toHaveLength(0);
    expect(naTabela("creditos_comprados")).toHaveLength(0);
  });

  it("500 se o banco falhar", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.creditos_semana", new Error("x")]]);
    expect((await GET(req())).status).toBe(500);
  });
});
