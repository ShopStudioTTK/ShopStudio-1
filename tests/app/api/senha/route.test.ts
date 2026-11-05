import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);

import { getUser, naTabela, reiniciarDb, responderCom, updateUserById } from "../../../apoio/db-falso";
import { POST } from "@/app/api/senha/route";

const req = (body: unknown) =>
  new Request("http://x/api/senha", {
    method: "POST",
    headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const PENDENTE: [string, Record<string, unknown>[]] = ["from public.senhas_temporarias", [{ valida: true }]];

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  updateUserById.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  responderCom([PENDENTE]);
});

describe("POST /api/senha", () => {
  it("troca a senha da própria conta e tira a marca de temporária", async () => {
    expect((await POST(req({ senha: "nova123", user_id: "u2" }))).status).toBe(204);
    expect(updateUserById).toHaveBeenCalledWith("u1", { password: "nova123" });
    const apagou = naTabela("senhas_temporarias").find((c) => c.sql.startsWith("delete"));
    expect(apagou?.valores).toEqual(["u1"]);
  });

  it("6 caracteres é o mínimo", async () => {
    expect((await POST(req({ senha: "12345" }))).status).toBe(400);
    expect((await POST(req({ senha: "123456" }))).status).toBe(204);
  });

  it.each([{}, { senha: 123456 }, { senha: "a".repeat(73) }])("senha inválida (%j) → 400", async (body) => {
    expect((await POST(req(body))).status).toBe(400);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("sem senha temporária pendente → 403 (não serve para trocar senha com um token roubado)", async () => {
    responderCom([]);
    expect((await POST(req({ senha: "nova123" }))).status).toBe(403);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("senha temporária expirada (30 min) → 403 e nada muda", async () => {
    responderCom([["from public.senhas_temporarias", [{ valida: false }]]]);
    const res = await POST(req({ senha: "nova123" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.message).toMatch(/expirou/);
    expect(updateUserById).not.toHaveBeenCalled();
    expect(naTabela("senhas_temporarias").some((c) => c.sql.startsWith("delete"))).toBe(false);
  });

  it("Supabase recusou a senha: 400 e a marca continua", async () => {
    updateUserById.mockResolvedValue({ data: { user: null }, error: { code: "same_password", message: "x" } });
    expect((await POST(req({ senha: "Temp123" }))).status).toBe(400);
    expect(naTabela("senhas_temporarias").some((c) => c.sql.startsWith("delete"))).toBe(false);
  });

  it("falha no Supabase: 500 e a marca continua", async () => {
    updateUserById.mockResolvedValue({ data: { user: null }, error: { code: "unexpected_failure", message: "x" } });
    expect((await POST(req({ senha: "nova123" }))).status).toBe(500);
    expect(naTabela("senhas_temporarias").some((c) => c.sql.startsWith("delete"))).toBe(false);
  });
});
