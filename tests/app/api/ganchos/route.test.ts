import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { consultas, getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GANCHOS_POR_DIA, GET, PATCH, POST } from "@/app/api/ganchos/route";
import { POST as NOTA } from "@/app/api/ganchos/nota/route";

const ID = "11111111-2222-3333-4444-555555555555";
const headers = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const req = (metodo: string, body?: unknown, url = "http://x/api/ganchos") =>
  new Request(url, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });

const comoAdmin = (extra: [string, Record<string, unknown>[]][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  responderCom([["from public.entitlements", [{}]]]);
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/ganchos", () => {
  it("lista o banco e a comunidade com a média e a nota da aluna logada, sem o autor", async () => {
    const ganchos = [{ id: ID, categoria: "quebra", texto: "Olha isso", comunidade: true, media: 4.5, notas: 2, minhaNota: 5 }];
    responderCom([["from public.entitlements", [{}]], ["from public.ganchos", ganchos]]);
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ganchos });
    const [c] = naTabela("ganchos");
    expect(c.valores).toEqual(["u1"]); // a "minhaNota" é sempre a da conta do token
    expect(c.sql).not.toContain("g.user_id");
  });
});

describe("POST /api/ganchos (aluna registra o dela)", () => {
  it("grava na comunidade em nome de quem está logada, nunca do corpo", async () => {
    const gancho = { id: ID, categoria: "curiosidade", texto: "Ninguém fala disso", comunidade: true };
    responderCom([["from public.entitlements", [{}]], ["insert into public.ganchos", [gancho]]]);
    const res = await POST(req("POST", { categoria: "curiosidade", texto: "  Ninguém fala disso ", user_id: "u2" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ gancho: { ...gancho, media: null, notas: 0, minhaNota: null } });
    const [c] = naTabela("ganchos");
    expect(c.valores.slice(0, 3)).toEqual(["curiosidade", "Ninguém fala disso", "u1"]);
    expect(c.valores).toContain("u1");
    expect(c.valores).not.toContain("u2");
    expect(c.valores.at(-1)).toBe(GANCHOS_POR_DIA);
  });

  it("tipo fora da lista ou texto curto/longo demais → 400, sem gravar", async () => {
    for (const body of [
      { categoria: "outra", texto: "Um gancho bom" },
      { texto: "Um gancho bom" },
      { categoria: "quebra", texto: "oi" },
      { categoria: "quebra", texto: 42 },
      { categoria: "quebra", texto: "x".repeat(201) },
    ])
      expect((await POST(req("POST", body))).status).toBe(400);
    expect(naTabela("ganchos")).toHaveLength(0);
  });

  it(`passou de ${GANCHOS_POR_DIA} no dia → 429`, async () => {
    // o insert só acontece se a contagem do dia estiver abaixo do limite: sem linha devolvida
    expect((await POST(req("POST", { categoria: "quebra", texto: "Um gancho bom" }))).status).toBe(429);
  });
});

describe("PATCH /api/ganchos (só admin)", () => {
  it("aluna fora de admins → 403, sem tocar nos ganchos", async () => {
    expect((await PATCH(req("PATCH", { id: ID, categoria: "quebra", texto: "Editado aqui" }))).status).toBe(403);
    expect(naTabela("ganchos")).toHaveLength(0);
    expect(consultas.at(-1)?.sql).toContain("public.admins");
  });

  it("edita o tipo e o texto de qualquer gancho", async () => {
    const gancho = { id: ID, categoria: "problema", texto: "Editado aqui", comunidade: false };
    comoAdmin([["update public.ganchos", [gancho]]]);
    const res = await PATCH(req("PATCH", { id: ID, categoria: "problema", texto: " Editado aqui " }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ gancho });
    expect(naTabela("ganchos")[0].valores).toEqual(["problema", "Editado aqui", ID]);
  });

  it("id inválido ou campos ruins → 400; gancho que não existe → 404", async () => {
    comoAdmin();
    expect((await PATCH(req("PATCH", { id: "1 or 1=1", categoria: "quebra", texto: "Editado aqui" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { id: ID, categoria: "x", texto: "Editado aqui" }))).status).toBe(400);
    expect(naTabela("ganchos")).toHaveLength(0);
    expect((await PATCH(req("PATCH", { id: ID, categoria: "quebra", texto: "Editado aqui" }))).status).toBe(404);
  });
});

describe("DELETE /api/ganchos (só admin)", () => {
  const del = (id: string) => DELETE(req("DELETE", undefined, `http://x/api/ganchos?id=${encodeURIComponent(id)}`));

  it("aluna fora de admins → 403, sem apagar", async () => {
    expect((await del(ID)).status).toBe(403);
    expect(naTabela("ganchos")).toHaveLength(0);
  });

  it("apaga qualquer gancho pelo id", async () => {
    comoAdmin();
    expect((await del(ID)).status).toBe(204);
    expect(naTabela("ganchos")[0].valores).toEqual([ID]);
  });

  it("id fora do formato → 400", async () => {
    comoAdmin();
    expect((await del("1 or 1=1")).status).toBe(400);
    expect(naTabela("ganchos")).toHaveLength(0);
  });
});

describe("POST /api/ganchos/nota", () => {
  const nota = (body: unknown) => NOTA(req("POST", body, "http://x/api/ganchos/nota"));

  it("grava ou troca a nota da conta logada, nunca a do corpo", async () => {
    expect((await nota({ id: ID, nota: 4, user_id: "u2" })).status).toBe(204);
    const [c] = naTabela("gancho_notas");
    expect(c.valores).toEqual([ID, "u1", 4]);
    expect(c.sql).toContain("on conflict (gancho_id, user_id) do update");
  });

  it("nota fora de 1 a 5 ou id inválido → 400", async () => {
    for (const body of [{ id: ID, nota: 0 }, { id: ID, nota: 6 }, { id: ID, nota: 2.5 }, { id: ID, nota: "5" }, { id: "x", nota: 3 }])
      expect((await nota(body)).status).toBe(400);
    expect(naTabela("gancho_notas")).toHaveLength(0);
  });

  it("gancho apagado (FK) → 404", async () => {
    responderCom([
      ["from public.entitlements", [{}]],
      ["insert into public.gancho_notas", Object.assign(new Error("fk"), { code: "23503" })],
    ]);
    expect((await nota({ id: ID, nota: 3 })).status).toBe(404);
  });
});
