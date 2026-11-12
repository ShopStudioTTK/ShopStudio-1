import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET, POST } from "@/app/api/frases-musica/route";

const comToken = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const post = (body: unknown) =>
  POST(new Request("http://x/api/frases-musica", { method: "POST", headers: comToken, body: JSON.stringify(body) }));
const comoAdmin = (extra: [string, Record<string, unknown>[]][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);
const ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  reiniciarDb();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("/api/frases-musica", () => {
  it("GET lista o banco", async () => {
    comoAdmin([["from public.frases_musica", [{ id: ID, frase: "a" }]]]);
    const res = await GET(new Request("http://x/api/frases-musica", { headers: comToken }));
    expect(await res.json()).toEqual({ frases: [{ id: ID, frase: "a" }] });
  });

  it("POST importa as boas de uma vez, conta repetidas e devolve as recusadas", async () => {
    comoAdmin([["insert into public.frases_musica", [{ id: ID }]]]);
    const texto = "Categoria\tProduto\tFrase\tTipo\tCena\nPijama\tPijama americano\tpov: a\tPOV\tCama\nCasa\tToalha\tb\tHumor\tBanheiro\nruim";
    const res = await post({ texto });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ novas: 1, repetidas: 1, recusadas: [{ linha: 4, motivo: expect.stringContaining("faltam colunas") }] });
    const [ins] = naTabela("frases_musica");
    expect(ins.valores).toEqual(["u1", ["Pijama", "Casa"], ["Pijama americano", "Toalha"], ["pov: a", "b"], ["POV", "Humor"], ["Cama", "Banheiro"]]);
  });

  it.each([{}, { texto: "   " }, { texto: "só uma coluna" }])("POST sem linha boa (%j) → 400 sem gravar", async (body) => {
    comoAdmin();
    expect((await post(body)).status).toBe(400);
    expect(naTabela("frases_musica")).toHaveLength(0);
  });

  it("DELETE apaga pelo id; id inexistente → 404", async () => {
    comoAdmin([["delete from public.frases_musica", [{ id: ID }]]]);
    const del = (id: string) => DELETE(new Request(`http://x/api/frases-musica?id=${id}`, { method: "DELETE", headers: comToken }));
    expect((await del(ID)).status).toBe(204);
    comoAdmin();
    expect((await del(ID)).status).toBe(404);
  });
});
