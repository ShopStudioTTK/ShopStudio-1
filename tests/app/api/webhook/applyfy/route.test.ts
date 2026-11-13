import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
const criarConta = vi.fn();
vi.mock("@/lib/contas", () => ({ criarConta: (email: string) => criarConta(email) }));
const enviarEmailDeAcesso = vi.fn();
vi.mock("@/lib/email", () => ({ enviarEmailDeAcesso: (d: unknown) => enviarEmailDeAcesso(d) }));

import { naTabela, reiniciarDb, responderCom } from "../../../../apoio/db-falso";
import { POST } from "@/app/api/webhook/applyfy/route";

const TOKEN = "token-da-applyfy";

const pago = (o: Record<string, unknown> = {}) => ({
  event: "TRANSACTION_PAID",
  token: TOKEN,
  client: { name: "Ana", email: "  Aluna@X.com " },
  transaction: { id: "tx1", status: "COMPLETED" },
  orderItems: [{ product: { id: "prod-1", externalId: null, name: "Shop Studio" } }],
  ...o,
});
const req = (body: unknown) =>
  new Request("http://x/api/webhook/applyfy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("APPLYFY_WEBHOOK_TOKEN", TOKEN);
  vi.stubEnv("APPLYFY_PRODUTO_IDS", "prod-1, prod-2");
  vi.spyOn(console, "error").mockImplementation(() => {});
  reiniciarDb();
  responderCom([["insert into public.compras_applyfy", [{ transaction_id: "tx1" }]]]);
  criarConta.mockResolvedValue({ senhaTemporaria: "Temp123" });
  enviarEmailDeAcesso.mockResolvedValue(undefined);
});

describe("POST /api/webhook/applyfy", () => {
  it("compra paga do produto: cria a conta e manda o e-mail com a senha, que não volta na resposta", async () => {
    const res = await POST(req(pago()));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain("Temp123");
    expect(criarConta).toHaveBeenCalledWith("aluna@x.com");
    expect(enviarEmailDeAcesso).toHaveBeenCalledWith({ email: "aluna@x.com", nome: "Ana", senhaTemporaria: "Temp123" });
    expect(naTabela("compras_applyfy")[0].valores).toEqual(["tx1", "aluna@x.com"]);
  });

  it("o produto pode vir pelo externalId", async () => {
    await POST(req(pago({ orderItems: [{ product: { id: "outro", externalId: "prod-2" } }] })));
    expect(criarConta).toHaveBeenCalled();
  });

  it("sem token configurado no servidor → 500, nada feito", async () => {
    vi.stubEnv("APPLYFY_WEBHOOK_TOKEN", "");
    expect((await POST(req(pago()))).status).toBe(500);
    expect(criarConta).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "errado", `${TOKEN}x`, 123])("token ausente ou errado (%s) → 401, nada feito", async (token) => {
    expect((await POST(req(pago({ token })))).status).toBe(401);
    expect(criarConta).not.toHaveBeenCalled();
    expect(naTabela("compras_applyfy")).toHaveLength(0);
  });

  it("corpo que não é JSON → 401", async () => {
    const r = new Request("http://x/api/webhook/applyfy", { method: "POST", body: "lixo" });
    expect((await POST(r)).status).toBe(401);
  });

  it.each(["TRANSACTION_CREATED", "TRANSACTION_CANCELED", "TRANSACTION_REFUNDED", "TRANSACTION_CHARGED_BACK"])(
    "%s → 200 e ignorado",
    async (event) => {
      expect((await POST(req(pago({ event })))).status).toBe(200);
      expect(criarConta).not.toHaveBeenCalled();
    },
  );

  it("outro produto → 200 e ignorado", async () => {
    expect((await POST(req(pago({ orderItems: [{ product: { id: "curso-x" } }] })))).status).toBe(200);
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("sem lista de produtos configurada → 500, nada criado (não libera qualquer produto)", async () => {
    vi.stubEnv("APPLYFY_PRODUTO_IDS", "");
    expect((await POST(req(pago()))).status).toBe(500);
    expect(criarConta).not.toHaveBeenCalled();
  });

  it.each([{ client: { email: "sem-arroba" } }, { client: null }, { transaction: { id: null } }])(
    "dados inválidos (%j) → 200 com erro no log, nada criado",
    async (o) => {
      expect((await POST(req(pago(o)))).status).toBe(200);
      expect(criarConta).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    },
  );

  it("aviso repetido da mesma transação → 200, sem criar conta nem mandar e-mail de novo", async () => {
    responderCom([["insert into public.compras_applyfy", []]]);
    expect((await POST(req(pago()))).status).toBe(200);
    expect(criarConta).not.toHaveBeenCalled();
    expect(enviarEmailDeAcesso).not.toHaveBeenCalled();
  });

  it("aluna que já definiu a senha → e-mail sem senha", async () => {
    criarConta.mockResolvedValue("existe");
    expect((await POST(req(pago()))).status).toBe(200);
    expect(enviarEmailDeAcesso).toHaveBeenCalledWith({ email: "aluna@x.com", nome: "Ana", senhaTemporaria: null });
  });

  it.each([
    ["criar a conta", () => criarConta.mockRejectedValue(new Error("x"))],
    ["mandar o e-mail", () => enviarEmailDeAcesso.mockRejectedValue(new Error("x"))],
  ])("falha ao %s → 500 e libera a transação para a Applyfy reenviar", async (_, falhar) => {
    falhar();
    expect((await POST(req(pago()))).status).toBe(500);
    expect(naTabela("compras_applyfy").at(-1)?.sql).toMatch(/^delete from public.compras_applyfy/);
  });

  it("nunca escreve a senha no log", async () => {
    enviarEmailDeAcesso.mockRejectedValue(new Error("falhou"));
    await POST(req(pago()));
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Temp123");
  });

  describe("curso (APPLYFY_PRODUTOS_CURSO)", () => {
    beforeEach(() => vi.stubEnv("APPLYFY_PRODUTOS_CURSO", "curso-1, combo-1"));
    const alunas = () => naTabela("alunas_curso");

    it("compra só do curso: grava a aluna e não cria conta do Shop Studio", async () => {
      const res = await POST(req(pago({ orderItems: [{ product: { id: "curso-1" } }] })));
      expect(await res.json()).toEqual({ status: "aluna_registrada" });
      expect(alunas()[0].valores).toEqual(["aluna@x.com"]);
      expect(criarConta).not.toHaveBeenCalled();
      expect(naTabela("compras_applyfy")).toHaveLength(0);
    });

    it("combo (nas duas listas): grava a aluna e libera o Shop Studio", async () => {
      vi.stubEnv("APPLYFY_PRODUTO_IDS", "prod-1, combo-1");
      await POST(req(pago({ orderItems: [{ product: { id: "combo-1" } }] })));
      expect(alunas()).toHaveLength(1);
      expect(criarConta).toHaveBeenCalledWith("aluna@x.com");
    });

    it("falha ao gravar a aluna não segura a liberação", async () => {
      vi.stubEnv("APPLYFY_PRODUTO_IDS", "prod-1, combo-1");
      responderCom([
        ["insert into public.alunas_curso", new Error("caiu")],
        ["insert into public.compras_applyfy", [{ transaction_id: "tx1" }]],
      ]);
      const res = await POST(req(pago({ orderItems: [{ product: { id: "combo-1" } }] })));
      expect(res.status).toBe(200);
      expect(criarConta).toHaveBeenCalled();
    });

    it("produto só do Shop Studio não grava aluna", async () => {
      await POST(req(pago()));
      expect(alunas()).toHaveLength(0);
    });
  });
});
