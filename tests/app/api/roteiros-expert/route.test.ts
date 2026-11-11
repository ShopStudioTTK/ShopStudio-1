import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { GET } from "@/app/api/roteiros-expert/route";

const req = () => new Request("http://x/api/roteiros-expert", { headers: { Authorization: "Bearer tok" } });
const linha = {
  id: "f1", produto: "Sérum", tipo: "skincare", formato: "Unboxing", gancho_gatilho: "fofoca", gatilho_rotulo: "Fofoca",
  gancho: "g", gancho_porque: "pq", gancho_entonacao: "baixinho", problema: "p", problema_porque: null, problema_entonacao: null,
  solucao: "s", solucao_porque: null, solucao_entonacao: null, cta: "c", cta_porque: null, cta_entonacao: null,
  embedding: "[1,2]", criado_por: "u9",
};

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/roteiros-expert", () => {
  it("toda aluna com acesso vê os roteiros da expert, com o porquê, sem nada interno", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.fichas_roteiro", [linha]]]);
    const { fichas } = await (await GET(req())).json();
    expect(fichas).toEqual([
      {
        id: "f1", produto: "Sérum", tipo: "skincare", formato: "Unboxing", gatilho: { slug: "fofoca", rotulo: "Fofoca" },
        gancho: { texto: "g", porque: "pq", entonacao: "baixinho" },
        problema: { texto: "p", porque: null, entonacao: null },
        solucao: { texto: "s", porque: null, entonacao: null },
        cta: { texto: "c", porque: null, entonacao: null },
      },
    ]);
    const sql = naTabela("fichas_roteiro")[0].sql;
    expect(sql).not.toMatch(/embedding|criado_por/);
    expect(sql).toContain("order by f.criado_em desc");
  });

  it("500 se o banco falhar", async () => {
    responderCom([["from public.entitlements", [{}]], ["from public.fichas_roteiro", new Error("x")]]);
    expect((await GET(req())).status).toBe(500);
  });
});
