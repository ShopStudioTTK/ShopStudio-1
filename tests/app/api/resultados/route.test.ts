import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, PATCH, POST } from "@/app/api/resultados/route";

const ID = "11111111-2222-3333-4444-555555555555";
const VIDEO = "https://www.tiktok.com/@ana/video/7106594312292453675";
const req = (method: string, body?: unknown, url = "/api/resultados") =>
  new Request(`http://x${url}`, {
    method,
    headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const msg = async (res: Response) => (await res.json()).error.message;
const insert = () => naTabela("success_cases").find((c) => c.sql.startsWith("insert"));

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: { full_name: "Ana Souza" } } }, error: null });
  responderCom([["from public.entitlements", [{}]], ["insert into public.success_cases", [{ id: ID }]]]);
});

describe("POST /api/resultados", () => {
  it("o nome vem da conta, não do corpo; fixar no topo não vem da aluna", async () => {
    const res = await POST(req("POST", { aluna: "Outra Pessoa", texto: "Vendi!", destaque: true, midiaUrl: VIDEO }));
    expect(res.status).toBe(201);
    const { sql, valores } = insert()!;
    expect(valores).toContain("Ana Souza");
    expect(valores).not.toContain("Outra Pessoa");
    expect(valores).not.toContain(true);
    expect(sql).not.toContain("destaque");
    expect(valores).toContain(VIDEO);
  });

  it("conta sem nome aparece como aluna do Shop Studio", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } }, error: null });
    await POST(req("POST", { texto: "Vendi!" }));
    expect(insert()!.valores).toContain("Aluna do Shop Studio");
  });

  it("só vídeo do TikTok: imagem, outro site ou javascript: → 400, sem gravar", async () => {
    for (const midiaUrl of ["https://i.imgur.com/x.png", "https://drive.google.com/file/d/1/view", "javascript:alert(1)"]) {
      const res = await POST(req("POST", { texto: "Vendi!", midiaUrl }));
      expect(res.status).toBe(400);
      expect(await msg(res)).toBe("Cole o link de um vídeo do TikTok.");
    }
    expect(insert()).toBeUndefined();
  });

  it("link com query é limpo; link curto do celular é resolvido pelo redirecionamento", async () => {
    await POST(req("POST", { midiaUrl: `${VIDEO}?is_from_webapp=1` }));
    expect(insert()!.valores).toContain(VIDEO);

    reiniciarDb();
    responderCom([["from public.entitlements", [{}]], ["insert into public.success_cases", [{ id: ID }]]]);
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 301, headers: { location: `${VIDEO}?_r=1` } }));
    await POST(req("POST", { midiaUrl: "vt.tiktok.com/ZSabc123/" }));
    expect(fetch).toHaveBeenCalledWith("https://vt.tiktok.com/ZSabc123/", expect.objectContaining({ redirect: "manual" }));
    expect(insert()!.valores).toContain(VIDEO);
  });

  it("sem depoimento e sem vídeo → 400", async () => {
    const res = await POST(req("POST", { resultado: "primeira venda" }));
    expect(res.status).toBe(400);
    expect(await msg(res)).toBe("Escreva o depoimento ou cole o link do vídeo.");
  });

  it("resultado em uma linha: até 80 caracteres", async () => {
    await POST(req("POST", { texto: "Vendi!", resultado: "x".repeat(200) }));
    expect(insert()!.valores).toContain("x".repeat(80));
  });

  it("10 por dia, contados no próprio insert da aluna logada → 429 no 11º", async () => {
    await POST(req("POST", { texto: "Vendi!" }));
    const { sql, valores } = insert()!;
    expect(sql).toMatch(/select count\(\*\) from public\.success_cases where user_id = \? and created_at >= \?\) < \?/);
    expect(valores.filter((v) => v === "u1")).toHaveLength(2);
    expect(valores).toContain(10);

    responderCom([["from public.entitlements", [{}]]]);
    const res = await POST(req("POST", { texto: "Vendi!" }));
    expect(res.status).toBe(429);
    expect(await msg(res)).toBe("Você publicou os 10 resultados de hoje. Amanhã tem mais.");
  });
});

describe("PATCH /api/resultados (fixar, só admin)", () => {
  it("admin fixa e desafixa qualquer resultado", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ["update public.success_cases", [{}]]]);
    expect((await PATCH(req("PATCH", { id: ID, destaque: true }))).status).toBe(204);
    const up = naTabela("success_cases").at(-1)!;
    expect(up.valores).toEqual([true, ID]);
    expect(up.sql).not.toContain("user_id");
  });

  it("pedido malformado → 400; resultado que não existe → 404", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]]]);
    expect((await PATCH(req("PATCH", { id: "1 or 1=1", destaque: true }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { id: ID, destaque: "sim" }))).status).toBe(400);
    expect((await PATCH(req("PATCH", { id: ID, destaque: true }))).status).toBe(404);
  });
});

describe("DELETE /api/resultados", () => {
  it("apaga só o da aluna logada", async () => {
    responderCom([["from public.entitlements", [{}]], ["delete from public.success_cases", [{}]]]);
    expect((await DELETE(req("DELETE", undefined, `/api/resultados?id=${ID}`))).status).toBe(204);
    expect(naTabela("success_cases").at(-1)!.valores).toEqual([ID, "u1"]);
  });
});
