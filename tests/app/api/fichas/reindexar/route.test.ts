import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));
const gerarEmbedding = vi.fn();
vi.mock("@/lib/embedding", () => ({ gerarEmbedding: (t: string) => gerarEmbedding(t) }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../../apoio/db-falso";
import { POST } from "@/app/api/fichas/reindexar/route";

const req = () => new Request("http://x/api/fichas/reindexar", { method: "POST", headers: { Authorization: "Bearer tok" } });

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  gerarEmbedding.mockResolvedValue([0.1, 0.2]);
});

describe("POST /api/fichas/reindexar (só admin)", () => {
  it("refaz o embedding de todas, em minúsculas, e conta as que falharam", async () => {
    responderCom([
      ["from public.entitlements", [{}]],
      ["from public.admins", [{}]],
      ["select id, produto, tipo from public.fichas_roteiro", [
        { id: "a", produto: "KIT DE 3 BLUSINHAS", tipo: "Moda" },
        { id: "b", produto: "Papete", tipo: "calçado" },
      ]],
    ]);
    gerarEmbedding.mockImplementation(async (t: string) => {
      if (t.startsWith("papete")) throw new Error("fora do ar");
      return [0.1, 0.2];
    });
    const res = await POST(req());
    expect(await res.json()).toEqual({ total: 2, indexadas: 1 });
    expect(gerarEmbedding).toHaveBeenCalledWith("kit de 3 blusinhas — moda");
    const updates = naTabela("fichas_roteiro").filter((c) => c.sql.startsWith("update"));
    expect(updates).toHaveLength(1);
    expect(updates[0].valores).toContain("a");
  });
});
