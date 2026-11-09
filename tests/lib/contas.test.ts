import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../apoio/db-falso")).adminFalso);

import { consultas, createUser, deleteUser, naTabela, reiniciarDb, responderCom, updateUserById } from "../apoio/db-falso";
import { criarConta, estadoDaSenhaTemporaria } from "@/lib/contas";

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  createUser.mockResolvedValue({ data: { user: { id: "nova" } }, error: null });
  deleteUser.mockResolvedValue({ data: {}, error: null });
  updateUserById.mockResolvedValue({ data: {}, error: null });
});

const JA_EXISTE = { data: { user: null }, error: { code: "email_exists", message: "já existe" } };

describe("criarConta", () => {
  it("cria o usuário confirmado com a senha temporária e a devolve", async () => {
    const r = await criarConta("aluna@x.com");
    if (r === "existe") throw new Error("não devia existir");
    expect(r.senhaTemporaria).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(createUser).toHaveBeenCalledWith({ email: "aluna@x.com", password: r.senhaTemporaria, email_confirm: true });
  });

  it("cada conta ganha uma senha diferente", async () => {
    const a = await criarConta("a@x.com");
    const b = await criarConta("b@x.com");
    expect(a).not.toEqual(b);
  });

  it("marca a senha como temporária e libera o acesso numa consulta só (atômica)", async () => {
    await criarConta("aluna@x.com");
    expect(consultas).toHaveLength(1);
    expect(consultas[0].sql).toContain("public.senhas_temporarias");
    expect(consultas[0].sql).toContain("public.entitlements");
    expect(consultas[0].valores.every((v) => v === "nova" || v === "compra")).toBe(true);
  });

  it("a marca nunca vai para os metadados do usuário (eles viajam no JWT, visíveis no navegador)", async () => {
    await criarConta("aluna@x.com");
    const atributos = createUser.mock.calls[0][0];
    expect(atributos).not.toHaveProperty("app_metadata");
    expect(atributos).not.toHaveProperty("user_metadata");
  });

  it("e-mail de quem já definiu a senha: devolve 'existe' e não muda nada", async () => {
    createUser.mockResolvedValue(JA_EXISTE);
    expect(await criarConta("aluna@x.com")).toBe("existe");
    expect(updateUserById).not.toHaveBeenCalled();
    expect(consultas.every((c) => c.sql.startsWith("select"))).toBe(true);
    expect(consultas[0].valores).toEqual(["aluna@x.com"]);
  });

  it("e-mail com senha temporária pendente (expirada ou não): gera outra e renova o prazo", async () => {
    createUser.mockResolvedValue(JA_EXISTE);
    responderCom([["join auth.users", [{ user_id: "antiga" }]]]);
    const r = await criarConta("aluna@x.com");
    if (r === "existe") throw new Error("devia gerar outra senha");
    expect(r.senhaTemporaria).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(updateUserById).toHaveBeenCalledWith("antiga", { password: r.senhaTemporaria });
    const renovou = naTabela("senhas_temporarias").find((c) => c.sql.startsWith("update"));
    expect(renovou?.sql).toContain("now()");
    expect(renovou?.valores).toEqual(["antiga"]);
  });

  it("falha ao gerar a senha nova: lança e não renova o prazo", async () => {
    createUser.mockResolvedValue(JA_EXISTE);
    responderCom([["join auth.users", [{ user_id: "antiga" }]]]);
    updateUserById.mockResolvedValue({ data: {}, error: { code: "unexpected_failure", message: "caiu" } });
    await expect(criarConta("aluna@x.com")).rejects.toThrow();
    expect(naTabela("senhas_temporarias").some((c) => c.sql.startsWith("update"))).toBe(false);
  });

  it("outro erro do Supabase: lança, sem tocar no banco", async () => {
    createUser.mockResolvedValue({ data: { user: null }, error: { code: "unexpected_failure", message: "caiu" } });
    await expect(criarConta("aluna@x.com")).rejects.toThrow();
    expect(consultas).toHaveLength(0);
  });

  it("banco falhou: apaga o usuário criado, para não sobrar conta pela metade", async () => {
    responderCom([["public.senhas_temporarias", new Error("caiu")]]);
    await expect(criarConta("aluna@x.com")).rejects.toThrow("caiu");
    expect(deleteUser).toHaveBeenCalledWith("nova");
  });
});

describe("estadoDaSenhaTemporaria", () => {
  it("sem linha: a senha já foi trocada (ou nunca foi temporária)", async () => {
    expect(await estadoDaSenhaTemporaria("u1")).toBeNull();
  });

  it("criada há menos de 24 horas: pendente", async () => {
    responderCom([["from public.senhas_temporarias", [{ valida: true }]]]);
    expect(await estadoDaSenhaTemporaria("u1")).toBe("pendente");
  });

  it("criada há mais de 24 horas: expirada", async () => {
    responderCom([["from public.senhas_temporarias", [{ valida: false }]]]);
    expect(await estadoDaSenhaTemporaria("u1")).toBe("expirada");
  });

  it("o prazo é de 24 horas, contado pelo relógio do banco, e só da conta pedida", async () => {
    await estadoDaSenhaTemporaria("u1");
    expect(consultas[0].sql).toContain("now()");
    expect(consultas[0].valores).toEqual([24 * 60, "u1"]);
  });
});
