import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb } from "../../../apoio/db-falso";
import { POST } from "@/app/api/roteiros-salvos/route";

const post = (body: unknown) =>
  POST(
    new Request("http://x/api/roteiros-salvos", {
      method: "POST",
      headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("POST /api/roteiros-salvos", () => {
  it("os cartões das fichas nunca são gravados, mesmo que o navegador mande", async () => {
    const res = await post({ produto: "Sérum", conteudo: { ganchos: ["a"], gatilho: "fofoca", fichas: { parecidas: [{ id: "f1" }] } } });
    expect(res.status).toBe(201);
    const gravado = JSON.parse(naTabela("saved_scripts")[0].valores.at(-1) as string);
    expect(gravado).toEqual({ ganchos: ["a"], gatilho: "fofoca" });
  });
});
