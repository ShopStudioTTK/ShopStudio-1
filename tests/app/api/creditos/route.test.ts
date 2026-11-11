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
  it("devolve quanto resta na semana da aluna logada", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.creditos_semana", [{ gastos: 7.5 }]]]);
    expect(await (await GET(req())).json()).toEqual({ restantes: 32.5 });
    const leitura = naTabela("creditos_semana")[0];
    expect(leitura.valores).toEqual(["u1", semanaSP()]);
    // numeric volta como texto no driver; o float8 garante número
    expect(leitura.sql).toContain("gastos::float8");
  });

  it("semana sem uso = 40", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    expect(await (await GET(req())).json()).toEqual({ restantes: 40 });
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
