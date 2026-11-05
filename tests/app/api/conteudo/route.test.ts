import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
import { getUser, reiniciarDb } from "../../../apoio/db-falso";

const temAcesso = vi.fn();
vi.mock("@/lib/access", () => ({ temAcesso: (v: boolean) => temAcesso(v) }));

import { GET } from "@/app/api/conteudo/[...nome]/route";
import { chapters } from "@/content/chapters";

const chamar = (nome: string, auth: string | null = "Bearer tok") =>
  GET(new Request(`http://x/api/conteudo/${nome}`, { headers: auth ? { Authorization: auth } : {} }), {
    params: Promise.resolve({ nome: nome.split("/") }),
  });

describe("GET /api/conteudo/[...nome]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    reiniciarDb();
    temAcesso.mockReturnValue(true);
  });

  it("sem token: 401, sem nem consultar o Supabase", async () => {
    expect((await chamar("ganchos", null)).status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("token inválido: 401", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "jwt expired" } });
    expect((await chamar("ganchos")).status).toBe(401);
  });

  it("sem acesso: 403", async () => {
    temAcesso.mockReturnValue(false);
    expect((await chamar("capitulos/mentalidade-de-shop-girl")).status).toBe(403);
  });

  it("nome que não existe: 404", async () => {
    expect((await chamar("capitulos/nao-existe")).status).toBe(404);
    expect((await chamar("outra-coisa")).status).toBe(404);
  });

  it("com acesso: devolve o conteúdo, sem cache compartilhado", async () => {
    const res = await chamar("ganchos");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const { conteudo } = await res.json();
    expect(conteudo.length).toBe(60);
  });

  it("todo o conteúdo pago está registrado", async () => {
    const nomes = ["ganchos", "desafio", "checklist", ...chapters.map((c) => `capitulos/${c.slug}`)];
    for (const nome of nomes) {
      const { conteudo } = await (await chamar(nome)).json();
      expect(conteudo?.length, nome).toBeGreaterThan(0);
    }
  });
});
