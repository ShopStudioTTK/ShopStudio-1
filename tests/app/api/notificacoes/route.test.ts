import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET, PATCH, POST } from "@/app/api/notificacoes/route";

const ID = "11111111-2222-3333-4444-555555555555";
const CRIADA = "2026-11-10T10:00:00Z";
const req = (method = "GET", body?: unknown, url = "/api/notificacoes") =>
  new Request(`http://x${url}`, {
    method,
    headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const linha = { id: ID, titulo: "Aula nova", descricao: "Saiu", link: null, link_texto: null, criado_em: "2026-11-15T10:00:00Z", vista: false };

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1", created_at: CRIADA } }, error: null });
});

describe("GET /api/notificacoes", () => {
  it("aluna: só as publicadas depois que a conta dela foi criada, com o que ela já viu", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.notificacoes n", [linha]]]);
    expect(await (await GET(req())).json()).toEqual({ notificacoes: [linha] });
    const [leitura] = naTabela("notificacoes");
    expect(leitura.sql).toContain("v.user_id = ?");
    expect(leitura.sql).toContain("n.criado_em > ?");
    expect(leitura.valores).toEqual(["u1", false, CRIADA]);
  });

  it("admin vê todas (para poder apagar)", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]]]);
    await GET(req());
    expect(naTabela("notificacoes")[0].valores).toEqual(["u1", true, CRIADA]);
  });

  it("500 se o banco falhar", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.notificacoes n", new Error("x")]]);
    expect((await GET(req())).status).toBe(500);
  });
});

describe("PATCH /api/notificacoes (marcar como vista)", () => {
  it("marca em nome de quem está logada, nunca do corpo", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    expect((await PATCH(req("PATCH", { id: ID, user_id: "u2" }))).status).toBe(200);
    const [marca] = naTabela("notificacoes_vistas");
    expect(marca.sql).toContain("on conflict do nothing");
    expect(marca.valores).toEqual(["u1", ID]);
  });

  it("400 sem id válido, sem tocar no banco", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    expect((await PATCH(req("PATCH", { id: "x" }))).status).toBe(400);
    expect(naTabela("notificacoes_vistas")).toHaveLength(0);
  });
});

describe("POST /api/notificacoes (só admin)", () => {
  it("aluna → 403, sem gravar", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    expect((await POST(req("POST", { titulo: "x", descricao: "y" }))).status).toBe(403);
    expect(naTabela("notificacoes")).toHaveLength(0);
  });

  it("admin cria com título, descrição e link com texto", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ["insert into public.notificacoes", [linha]]]);
    const res = await POST(req("POST", { titulo: "Aula nova", descricao: "Saiu", link: "https://a.com/x", linkTexto: "Ver" }));
    expect(res.status).toBe(201);
    // e já nasce vista para quem publicou
    expect(naTabela("notificacoes")[0].valores).toEqual(["Aula nova", "Saiu", "https://a.com/x", "Ver", "u1"]);
  });

  it("400 com o motivo, sem gravar", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]]]);
    const res = await POST(req("POST", { titulo: "x", descricao: "y", link: "http://a.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe("O link precisa começar com https://.");
    expect(naTabela("notificacoes")).toHaveLength(0);
  });
});

describe("DELETE /api/notificacoes (só admin)", () => {
  it("aluna → 403, sem apagar", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    expect((await DELETE(req("DELETE", undefined, `/api/notificacoes?id=${ID}`))).status).toBe(403);
    expect(naTabela("notificacoes")).toHaveLength(0);
  });

  it("admin apaga; id que não existe → 404", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ["delete from public.notificacoes", [{ id: ID }]]]);
    expect((await DELETE(req("DELETE", undefined, `/api/notificacoes?id=${ID}`))).status).toBe(200);
    expect(naTabela("notificacoes")[0].valores).toEqual([ID]);
    responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]]]);
    expect((await DELETE(req("DELETE", undefined, `/api/notificacoes?id=${ID}`))).status).toBe(404);
  });
});
