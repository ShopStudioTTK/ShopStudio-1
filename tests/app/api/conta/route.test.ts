import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { conferirSenha, getUser, naTabela, reiniciarDb, updateUserById } from "../../../apoio/db-falso";
import { PATCH } from "@/app/api/conta/route";

const req = (body: unknown) =>
  new Request("http://x/api/conta", {
    method: "PATCH",
    headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "ana@x.com", user_metadata: { full_name: "Ana" } } },
    error: null,
  });
  updateUserById.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  conferirSenha.mockResolvedValue("ok");
});

describe("PATCH /api/conta", () => {
  it("nome: muda sem pedir a senha atual, na conta do token e no perfil", async () => {
    expect((await PATCH(req({ nome: "  Ana Souza  ", user_id: "u2" }))).status).toBe(204);
    expect(conferirSenha).not.toHaveBeenCalled();
    expect(updateUserById).toHaveBeenCalledWith("u1", { user_metadata: { full_name: "Ana Souza" } });
    expect(naTabela("profiles")[0].valores).toEqual(["u1", "ana@x.com", "Ana Souza"]);
  });

  it("nome vazio → 400", async () => {
    expect((await PATCH(req({ nome: "   " }))).status).toBe(400);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("e-mail: confere a senha atual da conta logada e troca já confirmado", async () => {
    expect((await PATCH(req({ email: " Nova@X.com ", senhaAtual: "velha1" }))).status).toBe(204);
    expect(conferirSenha).toHaveBeenCalledWith("ana@x.com", "velha1");
    expect(updateUserById).toHaveBeenCalledWith("u1", { email: "nova@x.com", email_confirm: true });
    expect(naTabela("profiles")[0].valores).toEqual(["u1", "nova@x.com", "Ana"]);
  });

  it("senha: troca com a senha atual certa", async () => {
    expect((await PATCH(req({ senha: "nova123", senhaAtual: "velha1" }))).status).toBe(204);
    expect(updateUserById).toHaveBeenCalledWith("u1", { password: "nova123" });
  });

  it.each([{ email: "nova@x.com" }, { senha: "nova123" }, { senha: "nova123", senhaAtual: "" }])(
    "e-mail ou senha sem a senha atual (%j) → 403 (um token roubado sozinho não troca o login)",
    async (body) => {
      expect((await PATCH(req(body))).status).toBe(403);
      expect(updateUserById).not.toHaveBeenCalled();
    },
  );

  it("senha atual errada → 403; muitas tentativas → 429", async () => {
    conferirSenha.mockResolvedValue("errada");
    expect((await PATCH(req({ senha: "nova123", senhaAtual: "x" }))).status).toBe(403);
    conferirSenha.mockResolvedValue("limite");
    expect((await PATCH(req({ senha: "nova123", senhaAtual: "x" }))).status).toBe(429);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it.each([{ email: "sem-arroba" }, { senha: "12345" }, { senha: "a".repeat(73) }, {}, { email: "ana@x.com" }])(
    "pedido inválido ou sem mudança (%j) → 400",
    async (body) => {
      expect((await PATCH(req({ ...body, senhaAtual: "velha1" }))).status).toBe(400);
      expect(updateUserById).not.toHaveBeenCalled();
    },
  );

  it("e-mail de outra conta → 409", async () => {
    updateUserById.mockResolvedValue({ data: { user: null }, error: { code: "email_exists", message: "x" } });
    expect((await PATCH(req({ email: "outra@x.com", senhaAtual: "velha1" }))).status).toBe(409);
    expect(naTabela("profiles")).toHaveLength(0);
  });

  it("Supabase recusou a senha nova → 400; falha → 500", async () => {
    updateUserById.mockResolvedValue({ data: { user: null }, error: { code: "same_password", message: "x" } });
    expect((await PATCH(req({ senha: "velha1", senhaAtual: "velha1" }))).status).toBe(400);
    updateUserById.mockResolvedValue({ data: { user: null }, error: { code: "unexpected_failure", message: "x" } });
    expect((await PATCH(req({ senha: "nova123", senhaAtual: "velha1" }))).status).toBe(500);
  });
});
