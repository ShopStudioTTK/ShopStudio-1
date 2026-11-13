import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { GET, POST } from "@/app/api/alunas-curso/route";

const comToken = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const comoAdmin = (extra: [string, Record<string, unknown>[]][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("/api/alunas-curso", () => {
  it("GET conta as alunas", async () => {
    comoAdmin([["from public.alunas_curso", [{ total: 3, compras: 1 }]]]);
    expect(await (await GET(new Request("http://x/api/alunas-curso", { headers: comToken }))).json()).toEqual({ total: 3, compras: 1 });
  });

  it("POST grava os e-mails achados no texto, sem repetir", async () => {
    comoAdmin([["insert into public.alunas_curso", [{ email: "a@x.com" }]]]);
    const res = await POST(
      new Request("http://x/api/alunas-curso", { method: "POST", headers: comToken, body: JSON.stringify({ texto: "A@x.com, b@y.com\na@x.com" }) }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ lidos: 2, novas: 1, repetidas: 1 });
    expect(naTabela("alunas_curso")[0].valores).toEqual([["a@x.com", "b@y.com"]]);
  });

  it("POST sem e-mail → 400 sem gravar", async () => {
    comoAdmin();
    const res = await POST(new Request("http://x/api/alunas-curso", { method: "POST", headers: comToken, body: JSON.stringify({ texto: "nada" }) }));
    expect(res.status).toBe(400);
    expect(naTabela("alunas_curso")).toHaveLength(0);
  });
});
