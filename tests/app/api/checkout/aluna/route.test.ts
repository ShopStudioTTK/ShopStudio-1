import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../../apoio/db-falso")).adminFalso);

import { consultas, getUser, reiniciarDb, responderCom } from "../../../../apoio/db-falso";
import { POST } from "@/app/api/checkout/aluna/route";

const post = (body: unknown) =>
  POST(new Request("http://x/api/checkout/aluna", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  reiniciarDb();
});

describe("POST /api/checkout/aluna (pública)", () => {
  it("e-mail na lista → aluna: true, conferido em minúsculas e sem login", async () => {
    responderCom([["from public.alunas_curso", [{ "?column?": 1 }]]]);
    const res = await post({ email: "  Maria@X.com " });
    expect(await res.json()).toEqual({ aluna: true });
    expect(consultas[0].valores).toEqual(["maria@x.com"]);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("fora da lista → aluna: false, sem nenhum outro dado", async () => {
    const res = await post({ email: "x@y.com" });
    expect(await res.json()).toEqual({ aluna: false });
  });

  it.each([{}, { email: "nao-e-email" }, { email: 1 }])("e-mail inválido (%j) → 400 sem consultar", async (body) => {
    expect((await post(body)).status).toBe(400);
    expect(consultas).toHaveLength(0);
  });

  it("banco fora → 500", async () => {
    responderCom([["from public.alunas_curso", new Error("caiu")]]);
    expect((await post({ email: "x@y.com" })).status).toBe(500);
  });
});
