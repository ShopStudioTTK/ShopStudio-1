import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { GET, POST } from "@/app/api/gatilhos/route";

const comToken = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const post = (body: unknown) =>
  POST(new Request("http://x/api/gatilhos", { method: "POST", headers: comToken, body: JSON.stringify(body) }));
const comoAdmin = (extra: [string, Record<string, unknown>[]][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("/api/gatilhos", () => {
  it("GET lista na ordem de criação", async () => {
    comoAdmin([["from public.gatilhos", [{ slug: "fofoca", rotulo: "Fofoca" }]]]);
    const res = await GET(new Request("http://x/api/gatilhos", { headers: comToken }));
    expect(await res.json()).toEqual({ gatilhos: [{ slug: "fofoca", rotulo: "Fofoca" }] });
  });

  it("POST cria com o slug do nome", async () => {
    comoAdmin([["insert into public.gatilhos", [{ slug: "dor-de-cabeca", rotulo: "Dor de cabeça" }]]]);
    const res = await post({ rotulo: "  Dor de cabeça " });
    expect(res.status).toBe(201);
    expect(naTabela("gatilhos")[0].valores).toEqual(["dor-de-cabeca", "Dor de cabeça"]);
    expect((await res.json()).gatilho).toEqual({ slug: "dor-de-cabeca", rotulo: "Dor de cabeça" });
  });

  it("nome que vira um slug existente → 409", async () => {
    comoAdmin();
    const res = await post({ rotulo: "Fofóca" });
    expect(res.status).toBe(409);
    expect(naTabela("gatilhos")[0].valores[0]).toBe("fofoca");
  });

  it.each([{}, { rotulo: "   " }, { rotulo: "!!!" }])("nome inválido (%j) → 400 sem gravar", async (body) => {
    comoAdmin();
    expect((await post(body)).status).toBe(400);
    expect(naTabela("gatilhos")).toHaveLength(0);
  });
});
