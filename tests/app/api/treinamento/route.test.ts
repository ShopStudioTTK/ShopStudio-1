import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { consultas, getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET, PATCH, POST } from "@/app/api/treinamento/route";

const ID = "11111111-2222-3333-4444-555555555555";
const CONV = "99999999-2222-3333-4444-555555555555";
const vetor = Array.from({ length: 1536 }, () => 0.01);
const req = (method: string, body?: unknown, url = "/api/treinamento") =>
  new Request(`http://x${url}`, {
    method,
    headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const linha = (o: Record<string, unknown>) => ({
  id: ID, origem: "mapeada", status: "pendente", conversa_id: null, ordem: null, contexto: null,
  pergunta: "P", resposta_ia: null, resposta: null, indexada: false, criado_em: "2026-11-09", respondido_em: null,
  parecida_id: null, parecida_pergunta: null, parecida_resposta: null, parecida_similaridade: null,
  user_id: "u9", embedding: "[0.1]", respondido_por: "u9", ...o,
});
const base: [string, Record<string, unknown>[]][] = [
  ["from public.admins", [{}]],
  ["from public.entitlements", [{}]],
];
const atualizacao = () => naTabela("treinamento").find((c) => c.sql.startsWith("update"))!;
const insercao = () => naTabela("treinamento").find((c) => c.sql.startsWith("insert"))!;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("OPENROUTER_API_KEY", "chave");
  vi.spyOn(console, "error").mockImplementation(() => {});
  reiniciarDb();
  responderCom(base);
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ embedding: vetor }] }))) as typeof fetch;
});

describe("GET /api/treinamento", () => {
  it("agrupa a conversa em ordem e não devolve user_id, embedding nem respondido_por", async () => {
    responderCom([
      ...base,
      ["group by status", [{ status: "pendente", n: 3 }]],
      ["from public.treinamento t", [
        linha({ id: "a2", origem: "aluna", conversa_id: CONV, ordem: 2, pergunta: "e quanto tempo?" }),
        linha({ id: "a1", origem: "aluna", conversa_id: CONV, ordem: 1, pergunta: "como pedir amostra?", status: "respondida", resposta: "R",
          parecida_id: "x", parecida_pergunta: "PX", parecida_resposta: "RX", parecida_similaridade: 0.72 }),
        linha({ id: "m1" }),
      ]],
    ]);
    const res = await GET(req("GET", undefined, "/api/treinamento?status=pendente"));
    const json = await res.json();
    expect(json.conversas).toHaveLength(1);
    expect(json.conversas[0].id).toBe(CONV);
    expect(json.conversas[0].perguntas.map((p: { id: string }) => p.id)).toEqual(["a1", "a2"]);
    expect(json.conversas[0].perguntas[0].parecida).toEqual({ id: "x", pergunta: "PX", resposta: "RX", similaridade: 0.72 });
    expect(json.conversas[0].perguntas[1].parecida).toBeNull();
    expect(json.soltas.map((p: { id: string }) => p.id)).toEqual(["m1"]);
    expect(json.contagem).toEqual({ pendente: 3, respondida: 0, descartada: 0 });
    const texto = JSON.stringify(json);
    for (const proibido of ["user_id", "embedding", "respondido_por", "u9"]) expect(texto).not.toContain(proibido);
  });

  it("a parecida nunca é a própria pergunta e usa o limiar 0,6", async () => {
    await GET(req("GET"));
    const c = naTabela("treinamento").find((x) => x.sql.includes("from public.treinamento t"))!;
    expect(c.sql).toContain("r.id <> t.id");
    expect(c.valores).toContain(0.6);
  });

  it("status inválido vira pendente; nas outras abas, tudo solto", async () => {
    await GET(req("GET", undefined, "/api/treinamento?status=xyz"));
    expect(naTabela("treinamento").find((x) => x.sql.includes("from public.treinamento t"))!.valores).toContain("pendente");
    reiniciarDb();
    responderCom([...base, ["from public.treinamento t", [linha({ origem: "aluna", conversa_id: CONV, status: "respondida", resposta: "R" })]]]);
    const json = await (await GET(req("GET", undefined, "/api/treinamento?status=respondida"))).json();
    expect(json.conversas).toEqual([]);
    expect(json.soltas).toHaveLength(1);
  });
});

describe("POST /api/treinamento", () => {
  it("nova pergunta já respondida, por quem está logada", async () => {
    responderCom([...base, ["insert into public.treinamento", [{ id: ID }]]]);
    const res = await POST(req("POST", { pergunta: "P", resposta: "R", respondido_por: "u2" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: ID, indexada: true });
    expect(insercao().valores).toContain("u1");
    expect(insercao().valores).not.toContain("u2");
  });

  it("embedding falhou → grava mesmo assim, sem vetor, e avisa", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fora"));
    responderCom([...base, ["insert into public.treinamento", [{ id: ID }]]]);
    expect(await (await POST(req("POST", { pergunta: "P", resposta: "R" }))).json()).toEqual({ id: ID, indexada: false });
    expect(insercao().valores).toContain(null);
  });

  it("sem pergunta ou resposta → 400", async () => {
    expect((await POST(req("POST", { pergunta: "P" }))).status).toBe(400);
    expect((await POST(req("POST", { resposta: "R" }))).status).toBe(400);
  });
});

describe("PATCH /api/treinamento", () => {
  const existe = () => responderCom([...base, ["from public.treinamento where id", [{ pergunta: "P", contexto: "a\nb", status: "pendente", indexada: false }]]]);

  it("responder grava respondido_por do token, nunca do corpo", async () => {
    existe();
    const res = await PATCH(req("PATCH", { id: ID, resposta: "R", respondido_por: "u2" }));
    expect(await res.json()).toEqual({ indexada: true });
    expect(atualizacao().valores).toContain("u1");
    expect(atualizacao().valores).not.toContain("u2");
    expect(atualizacao().valores).toContain("respondida");
  });

  it("o embedding usa o contexto da conversa", async () => {
    existe();
    await PATCH(req("PATCH", { id: ID, resposta: "R" }));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).input).toContain("- b");
  });

  it("resposta longa é cortada em 4000", async () => {
    existe();
    await PATCH(req("PATCH", { id: ID, resposta: "x".repeat(5000) }));
    expect(atualizacao().valores).toContain("x".repeat(4000));
  });

  it("pedido malformado não chega no treinamento", async () => {
    existe();
    for (const body of [{ id: ID, status: "x" }, { id: "abc", resposta: "R" }, { id: ID }, { id: ID, status: "respondida" }])
      expect((await PATCH(req("PATCH", body))).status).toBe(400);
    expect(naTabela("treinamento")).toHaveLength(0);
  });

  it("linha inexistente → 404", async () => {
    expect((await PATCH(req("PATCH", { id: ID, status: "descartada" }))).status).toBe(404);
  });
});

describe("DELETE /api/treinamento", () => {
  it("apaga; inexistente → 404", async () => {
    expect((await DELETE(req("DELETE", { id: ID }))).status).toBe(404);
    responderCom([...base, ["delete from public.treinamento", [{ id: ID }]]]);
    expect((await DELETE(req("DELETE", { id: ID }))).status).toBe(204);
    expect((await DELETE(req("DELETE", { id: "abc" }))).status).toBe(400);
  });
});

it("aluna fora de admins → 403 sem tocar no treinamento", async () => {
  responderCom([["from public.entitlements", [{}]]]);
  for (const r of [GET(req("GET")), POST(req("POST", { pergunta: "P", resposta: "R" })), PATCH(req("PATCH", { id: ID, resposta: "R" })), DELETE(req("DELETE", { id: ID }))])
    expect((await r).status).toBe(403);
  expect(consultas.some((c) => c.sql.includes("public.treinamento"))).toBe(false);
});
