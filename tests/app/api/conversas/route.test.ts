import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET } from "@/app/api/conversas/route";

const ID = "11111111-2222-3333-4444-555555555555";
const req = (url: string, method = "GET") => new Request(`http://x${url}`, { method, headers: { Authorization: "Bearer tok" } });
const mensagens = [
  { role: "user", content: "Como pedir amostra?" },
  { role: "assistant", content: "Oi" },
];

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/conversas", () => {
  it("lista as 30 mais recentes da aluna, sem as mensagens", async () => {
    responderCom([["from public.conversas", [{ id: ID, titulo: "Como pedir amostra?", atualizado_em: "2026-11-12" }]]]);
    const res = await GET(req("/api/conversas"));
    expect(await res.json()).toEqual({ conversas: [{ id: ID, titulo: "Como pedir amostra?", atualizado_em: "2026-11-12" }] });
    const c = naTabela("conversas")[0];
    expect(c.sql).toContain("order by atualizado_em desc limit 30");
    expect(c.sql).not.toContain("mensagens");
  });

  it("?id= abre uma conversa com as mensagens", async () => {
    responderCom([["from public.conversas", [{ id: ID, titulo: "t", mensagens }]]]);
    const res = await GET(req(`/api/conversas?id=${ID}`));
    expect(await res.json()).toEqual({ conversa: { id: ID, titulo: "t", mensagens } });
  });

  it("404 para conversa que não existe (ou é de outra conta); 400 para id malformado", async () => {
    expect((await GET(req(`/api/conversas?id=${ID}`))).status).toBe(404);
    expect((await GET(req("/api/conversas?id=x"))).status).toBe(400);
  });

  it("500 se o banco falhar", async () => {
    responderCom([["from public.conversas", new Error("db")]]);
    expect((await GET(req("/api/conversas"))).status).toBe(500);
  });
});

describe("DELETE /api/conversas", () => {
  it("apaga a conversa da aluna", async () => {
    responderCom([["delete from public.conversas", [{}]]]);
    expect((await DELETE(req(`/api/conversas?id=${ID}`, "DELETE"))).status).toBe(204);
  });

  it("404 se não era dela; 400 sem id", async () => {
    expect((await DELETE(req(`/api/conversas?id=${ID}`, "DELETE"))).status).toBe(404);
    expect((await DELETE(req("/api/conversas", "DELETE"))).status).toBe(400);
    expect(naTabela("conversas")).toHaveLength(1);
  });
});
