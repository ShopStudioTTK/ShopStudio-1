import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const criarConta = vi.fn();
vi.mock("@/lib/contas", () => ({ criarConta: (email: string) => criarConta(email) }));

import { OPTIONS, POST } from "@/app/api/webhook/conta/route";

const SEGREDO = "segredo-da-plataforma";
const PLATAFORMA = "https://plataforma.com";

const req = (body: unknown, o: { auth?: string | null; origin?: string } = {}) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = o.auth === undefined ? `Bearer ${SEGREDO}` : o.auth;
  if (auth) headers.Authorization = auth;
  if (o.origin) headers.Origin = o.origin;
  return new Request("http://x/api/webhook/conta", { method: "POST", headers, body: JSON.stringify(body) });
};
const preflight = (origin: string) =>
  new Request("http://x/api/webhook/conta", { method: "OPTIONS", headers: { Origin: origin } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("WEBHOOK_CONTA_SEGREDO", SEGREDO);
  vi.stubEnv("WEBHOOK_CONTA_ORIGENS", `${PLATAFORMA}, https://outra-plataforma.com`);
  vi.spyOn(console, "error").mockImplementation(() => {});
  criarConta.mockResolvedValue({ senhaTemporaria: "Temp123" });
});

describe("POST /api/webhook/conta", () => {
  it("cria a conta e devolve a senha temporária", async () => {
    const res = await POST(req({ email: "  Aluna@X.com " }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ email: "aluna@x.com", senhaTemporaria: "Temp123" });
    expect(criarConta).toHaveBeenCalledWith("aluna@x.com");
  });

  it("sem segredo configurado no servidor → 500, nada criado", async () => {
    vi.stubEnv("WEBHOOK_CONTA_SEGREDO", "");
    expect((await POST(req({ email: "a@x.com" }))).status).toBe(500);
    expect(criarConta).not.toHaveBeenCalled();
  });

  it.each([null, "Bearer errado", SEGREDO, `Bearer ${SEGREDO}x`])("segredo ausente ou errado (%s) → 401", async (auth) => {
    expect((await POST(req({ email: "a@x.com" }, { auth }))).status).toBe(401);
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("origem fora da lista → 403, mesmo com o segredo certo", async () => {
    const res = await POST(req({ email: "a@x.com" }, { origin: "https://site-malicioso.com" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(criarConta).not.toHaveBeenCalled();
  });

  it("origem da lista: cria e devolve o CORS só para ela", async () => {
    const res = await POST(req({ email: "a@x.com" }, { origin: "https://outra-plataforma.com" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://outra-plataforma.com");
  });

  it("sem lista de origens, qualquer Origin enviado é recusado", async () => {
    vi.stubEnv("WEBHOOK_CONTA_ORIGENS", "");
    expect((await POST(req({ email: "a@x.com" }, { origin: PLATAFORMA }))).status).toBe(403);
  });

  it.each([{}, { email: "" }, { email: "sem-arroba" }, { email: "a@b" }, { email: 42 }, { email: `${"a".repeat(250)}@x.com` }])(
    "e-mail inválido (%j) → 400",
    async (body) => {
      expect((await POST(req(body))).status).toBe(400);
      expect(criarConta).not.toHaveBeenCalled();
    },
  );

  it("e-mail já cadastrado → 409", async () => {
    criarConta.mockResolvedValue("existe");
    expect((await POST(req({ email: "a@x.com" }))).status).toBe(409);
  });

  it("falha ao criar → 500 com mensagem genérica", async () => {
    criarConta.mockRejectedValue(new Error("detalhe interno"));
    const res = await POST(req({ email: "a@x.com" }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("detalhe interno");
  });
});

describe("OPTIONS /api/webhook/conta (preflight)", () => {
  it("origem da lista → 204 com os cabeçalhos de CORS", async () => {
    const res = await OPTIONS(preflight(PLATAFORMA));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(PLATAFORMA);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("origem fora da lista → 403 sem CORS", async () => {
    const res = await OPTIONS(preflight("https://site-malicioso.com"));
    expect(res.status).toBe(403);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
