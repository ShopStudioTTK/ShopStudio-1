import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/conhecimento/material", () => ({ DOSSIE: "D", TRANSCRICAO: "T" }));
vi.mock("@/lib/db", async () => {
  const b = await import("../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../apoio/db-falso")).adminFalso);
const temAcesso = vi.fn();
vi.mock("@/lib/access", () => ({ temAcesso: (v: boolean) => temAcesso(v) }));

import { consultas, getUser, reiniciarDb, responderCom } from "../../apoio/db-falso";

/**
 * Todas as rotas de src/app/api, achadas sozinhas: rota nova entra aqui sem ninguém lembrar.
 * Nenhuma rota pode tocar no banco sem token conferido, e só as de SO_LOGIN dispensam o acesso
 * e a troca da senha temporária. Os webhooks não são de aluna: em vez do token, exigem o segredo.
 */
const modulos = import.meta.glob<Record<string, unknown>>("../../../src/app/api/**/route.ts", { eager: true });
const SO_LOGIN = new Set(["perfil POST", "acesso GET", "acesso POST", "senha POST"]);
const WEBHOOK = new Set(["webhook/conta POST", "webhook/applyfy POST"]);
/** Só admin: aluna com acesso, mas fora de `admins`, leva 403 sem tocar na tabela da rota. */
const ADMIN = new Set([
  "treinamento GET", "treinamento POST", "treinamento PATCH", "treinamento DELETE",
  "campeoes POST", "campeoes DELETE",
]);
const DE_ALUNA_COM_ACESSO = (h: { nome: string }) => !SO_LOGIN.has(h.nome) && !WEBHOOK.has(h.nome);
const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const handlers = Object.entries(modulos).flatMap(([arquivo, mod]) => {
  const rota = arquivo.replace(/^.*src\/app\/api\//, "").replace(/\/route\.ts$/, "");
  return METODOS.filter((m) => typeof mod[m] === "function").map((m) => ({
    nome: `${rota} ${m}`,
    chamar: (auth: string | null) =>
      (mod[m] as (req: Request, ctx: unknown) => Promise<Response>)(
        new Request(`http://x/api/${rota}?capitulo=x`, {
          method: m,
          headers: auth ? { Authorization: auth, "Content-Type": "application/json" } : {},
          body: m === "GET" ? undefined : "{}",
        }),
        { params: Promise.resolve({ nome: ["ganchos"] }) },
      ),
  }));
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OPENROUTER_API_KEY", "chave");
  vi.stubEnv("OPENROUTER_MODEL", "modelo");
  vi.stubEnv("WEBHOOK_CONTA_SEGREDO", "segredo");
  vi.stubEnv("APPLYFY_WEBHOOK_TOKEN", "token");
  vi.stubEnv("APPLYFY_PRODUTO_IDS", "p1");
  vi.spyOn(console, "error").mockImplementation(() => {});
  reiniciarDb();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  temAcesso.mockReturnValue(true);
});

describe("toda rota da API", () => {
  it("foi encontrada", () => {
    expect(handlers.length).toBeGreaterThanOrEqual(12);
  });

  it.each(handlers)("$nome: sem token → 401 e nenhuma consulta", async ({ chamar }) => {
    expect((await chamar(null)).status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
    expect(consultas).toHaveLength(0);
  });

  it.each(handlers)("$nome: token falso → 401 e nenhuma consulta", async ({ chamar }) => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } });
    expect((await chamar("Bearer falso")).status).toBe(401);
    expect(consultas).toHaveLength(0);
  });

  it("inclui o webhook (senão as exceções acima protegem uma rota que não existe)", () => {
    expect(handlers.map((h) => h.nome)).toEqual(expect.arrayContaining([...WEBHOOK, ...SO_LOGIN, ...ADMIN]));
  });

  // só as consultas do acesso em si
  const soChecagens = () =>
    consultas.every((c) => c.sql.includes("public.entitlements") || c.sql.includes("public.senhas_temporarias"));

  it.each(handlers.filter((h) => ADMIN.has(h.nome)))("$nome: aluna com acesso, fora de admins → 403", async ({ chamar }) => {
    responderCom([["from public.entitlements", [{}]]]);
    expect((await chamar("Bearer tok")).status).toBe(403);
    expect(consultas.some((c) => /public\.(treinamento|campeoes)/.test(c.sql))).toBe(false);
  });

  it.each(handlers.filter(DE_ALUNA_COM_ACESSO))("$nome: sem acesso → 403", async ({ chamar }) => {
    temAcesso.mockReturnValue(false);
    expect((await chamar("Bearer tok")).status).toBe(403);
    expect(soChecagens()).toBe(true);
  });

  it.each(handlers.filter(DE_ALUNA_COM_ACESSO).flatMap((h) => [true, false].map((valida) => ({ ...h, valida }))))(
    "$nome: senha temporária ainda não trocada (no prazo: $valida) → 403",
    async ({ chamar, valida }) => {
      responderCom([["from public.senhas_temporarias", [{ valida }]]]);
      const res = await chamar("Bearer tok");
      expect(res.status).toBe(403);
      expect((await res.json()).error.message).toMatch(/senha/i);
      expect(soChecagens()).toBe(true);
    },
  );
});
