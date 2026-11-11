import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET, PATCH, POST } from "@/app/api/fichas/route";

const ID = "11111111-2222-3333-4444-555555555555";
const comToken = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const req = (method: string, body?: unknown, query = "") =>
  new Request(`http://x/api/fichas${query}`, {
    method,
    headers: comToken,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const parte = (texto: string, porque: string | null = null, entonacao: string | null = null) => ({ texto, porque, entonacao });
const FICHA = {
  produto: "Sérum",
  tipo: "skincare",
  formato: "Conselho de amiga",
  gatilho: "fofoca",
  gancho: parte("Ninguém te conta isso", "skincare vende por segredo", "baixinho"),
  problema: parte("pele opaca"),
  solucao: parte("textura na mão", "prova visual", "sobe o tom"),
  cta: parte("corre no carrinho"),
};
const vetor = Array.from({ length: 1536 }, () => 0.01);
const comoAdmin = (extra: [string, Record<string, unknown>[] | Error][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);
const gravou = () => naTabela("fichas_roteiro").find((c) => /^(insert|update)/.test(c.sql));

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("OPENROUTER_API_KEY", "chave");
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ embedding: vetor }] }))) as typeof fetch;
});

describe("POST /api/fichas", () => {
  it("cria: embedding só de produto e tipo; criado_por do token", async () => {
    comoAdmin([["insert into public.fichas_roteiro", [{ id: ID }]]]);
    const res = await POST(req("POST", { ...FICHA, criado_por: "u2" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, indexada: true });
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).input).toBe("sérum — skincare");
    expect(gravou()?.valores).toContain("u1");
    expect(gravou()?.valores).not.toContain("u2");
    expect(gravou()?.valores).toEqual(expect.arrayContaining(["baixinho", null, "prova visual"]));
  });

  it.each([
    { formato: "Dancinha" },
    { produto: "" },
    { tipo: "  " },
    { gatilho: "" },
    { gancho: parte("g", "", "e") },
    { gancho: parte("g", "p", null) },
    { problema: parte("") },
    { cta: null },
  ])("ficha inválida (%j) → 400 sem gravar", async (troca) => {
    comoAdmin();
    expect((await POST(req("POST", { ...FICHA, ...troca }))).status).toBe(400);
    expect(gravou()).toBeUndefined();
  });

  it("gatilho que não existe → 400", async () => {
    comoAdmin([["insert into public.fichas_roteiro", Object.assign(new Error("fk"), { code: "23503" })]]);
    const res = await POST(req("POST", { ...FICHA, gatilho: "nao-existe" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(/gatilho/i);
  });

  it("embedding fora do ar → salva com indexada: false", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fora"));
    comoAdmin([["insert into public.fichas_roteiro", [{ id: ID }]]]);
    const res = await POST(req("POST", FICHA));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: ID, indexada: false });
  });
});

describe("PATCH /api/fichas", () => {
  const ATUAL: [string, Record<string, unknown>[]] = ["from public.fichas_roteiro where id", [{ produto: "Sérum", tipo: "skincare", indexada: true }]];
  const UPD: [string, Record<string, unknown>[]] = ["update public.fichas_roteiro", [{ id: ID }]];
  const update = () => naTabela("fichas_roteiro").find((c) => c.sql.startsWith("update"));

  it("produto mudou: refaz o embedding", async () => {
    comoAdmin([ATUAL, UPD]);
    const res = await PATCH(req("PATCH", { ...FICHA, id: ID, produto: "Hidratante" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: ID, indexada: true });
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).input).toBe("hidratante — skincare");
    expect(update()?.valores).toContain(ID);
  });

  it("só o texto mudou: não chama o embedding e mantém o que já havia", async () => {
    comoAdmin([ATUAL, UPD]);
    const res = await PATCH(req("PATCH", { ...FICHA, id: ID, cta: parte("outro CTA") }));
    expect(await res.json()).toEqual({ id: ID, indexada: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(update()?.valores).toContain(true); // manter = true
  });

  it("embedding fora do ar com produto e tipo iguais: a ficha continua indexada", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fora"));
    comoAdmin([ATUAL, UPD]);
    expect(await (await PATCH(req("PATCH", { ...FICHA, id: ID, cta: parte("outro") }))).json()).toEqual({ id: ID, indexada: true });
  });

  it("ficha sem embedding: tenta indexar de novo ao editar", async () => {
    comoAdmin([["from public.fichas_roteiro where id", [{ produto: "Sérum", tipo: "skincare", indexada: false }]], UPD]);
    await PATCH(req("PATCH", { ...FICHA, id: ID }));
    expect(fetch).toHaveBeenCalled();
  });

  it("id que não existe → 404 sem chamar o embedding; id inválido → 400", async () => {
    comoAdmin();
    expect((await PATCH(req("PATCH", { ...FICHA, id: ID }))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    expect((await PATCH(req("PATCH", { ...FICHA, id: "x" }))).status).toBe(400);
  });
});

describe("exemplo fixo de voz", () => {
  it("POST e PATCH gravam a marca; sem ela, false", async () => {
    comoAdmin([["insert into public.fichas_roteiro", [{ id: ID }]]]);
    await POST(req("POST", { ...FICHA, exemploFixo: true }));
    expect(gravou()?.sql).toContain("exemplo_fixo");
    expect(gravou()?.valores).toContain(true);
    reiniciarDb();
    comoAdmin([
      ["select produto, tipo", [{ produto: "Sérum", tipo: "skincare", indexada: true }]],
      ["update public.fichas_roteiro", [{ id: ID }]],
    ]);
    await PATCH(req("PATCH", { ...FICHA, id: ID }));
    expect(gravou()?.sql).toContain("exemplo_fixo = ?");
    expect(gravou()?.valores).toContain(false);
  });

  it("GET devolve exemploFixo", async () => {
    comoAdmin([["from public.fichas_roteiro", [{
      id: ID, produto: "Sérum", tipo: "skincare", formato: "Unboxing", gancho_gatilho: "fofoca", gatilho_rotulo: "Fofoca",
      gancho: "g", problema: "x", solucao: "y", cta: "z", indexada: true, exemplo_fixo: true,
    }]]]);
    expect((await (await GET(req("GET"))).json()).fichas[0]).toMatchObject({ exemploFixo: true });
  });
});

describe("GET e DELETE /api/fichas", () => {
  it("GET não devolve embedding nem criado_por", async () => {
    comoAdmin([["from public.fichas_roteiro", [{
      id: ID, produto: "Sérum", tipo: "skincare", formato: "Unboxing", gancho_gatilho: "fofoca", gatilho_rotulo: "Fofoca",
      gancho: "g", gancho_porque: "p", gancho_entonacao: "e", problema: "x", solucao: "y", cta: "z",
      indexada: true, embedding: "[1]", criado_por: "u9",
    }]]]);
    const res = await GET(req("GET"));
    const texto = await res.text();
    expect(JSON.parse(texto).fichas[0]).toMatchObject({ id: ID, indexada: true, gatilho: { slug: "fofoca", rotulo: "Fofoca" } });
    for (const proibido of ["embedding", "criado_por", "u9"]) expect(texto).not.toContain(proibido);
  });

  it("DELETE apaga pelo ?id=; não existe → 404", async () => {
    comoAdmin([["delete from public.fichas_roteiro", [{ id: ID }]]]);
    expect((await DELETE(req("DELETE", undefined, `?id=${ID}`))).status).toBe(204);
    comoAdmin();
    expect((await DELETE(req("DELETE", undefined, `?id=${ID}`))).status).toBe(404);
    expect((await DELETE(req("DELETE", undefined, "?id=x"))).status).toBe(400);
  });
});
