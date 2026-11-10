import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { consultas, getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET, POST } from "@/app/api/campeoes/route";

const ID = "11111111-1111-4111-8111-111111111111";
const VIDEO = "https://www.tiktok.com/@ana.shop/video/7368550087632375046";
const comToken = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const get = (nicho?: string) => GET(new Request(`http://x/api/campeoes${nicho ? `?nicho=${nicho}` : ""}`, { headers: comToken }));
const post = (body: unknown) =>
  POST(new Request("http://x/api/campeoes", { method: "POST", headers: comToken, body: JSON.stringify(body) }));
const del = (id: string) => DELETE(new Request(`http://x/api/campeoes?id=${id}`, { method: "DELETE", headers: comToken }));

const comoAdmin = (extra: [string, Record<string, unknown>[]][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  responderCom([["from public.entitlements", [{}]]]);
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/campeoes", () => {
  it("devolve os vídeos cadastrados do nicho", async () => {
    const videos = [{ id: ID, url: VIDEO, titulo: "t" }];
    responderCom([["from public.entitlements", [{}]], ["from public.campeoes", videos]]);
    const res = await get("beleza");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ videos });
    const [consulta] = naTabela("campeoes");
    expect(consulta.valores).toContain("beleza");
  });

  it("sem nicho ou fora do formato → 400, sem consultar", async () => {
    for (const r of [await get(), await get("A%20B")]) expect(r.status).toBe(400);
    expect(naTabela("campeoes")).toHaveLength(0);
  });
});

describe("POST /api/campeoes (só admin)", () => {
  it("aluna fora de admins → 403, sem gravar", async () => {
    expect((await post({ nicho: "beleza", url: VIDEO })).status).toBe(403);
    expect(naTabela("campeoes")).toHaveLength(0);
  });

  it("grava o link limpo (sem query) no nicho", async () => {
    comoAdmin([["from public.nichos", [{}]], ["insert into public.campeoes", [{ id: ID, url: VIDEO, titulo: "Sérum" }]]]);
    const res = await post({ nicho: "beleza", url: `${VIDEO}?is_from_webapp=1&sender_device=pc`, titulo: "  Sérum " });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ video: { id: ID, url: VIDEO, titulo: "Sérum" } });
    expect(naTabela("campeoes").at(-1)?.valores).toEqual(["beleza", VIDEO, "Sérum"]);
  });

  it("link que não é de vídeo do TikTok → 400", async () => {
    comoAdmin();
    for (const url of ["https://vm.tiktok.com/ZMabc/", "https://youtube.com/shorts/abc", "http://www.tiktok.com/@a/video/1", "x", undefined])
      expect((await post({ nicho: "beleza", url })).status).toBe(400);
    expect(naTabela("campeoes")).toHaveLength(0);
  });

  it("nicho que não está em nichos → 400, sem gravar", async () => {
    comoAdmin();
    expect((await post({ nicho: "xyz", url: VIDEO })).status).toBe(400);
    expect(consultas.some((c) => c.sql.includes("insert into public.campeoes"))).toBe(false);
  });

  it("vídeo já cadastrado no nicho → 409", async () => {
    comoAdmin([["from public.nichos", [{}]]]); // o insert … on conflict do nothing não devolve linha
    expect((await post({ nicho: "beleza", url: VIDEO })).status).toBe(409);
  });
});

describe("DELETE /api/campeoes (só admin)", () => {
  it("aluna fora de admins → 403, sem apagar", async () => {
    expect((await del(ID)).status).toBe(403);
    expect(naTabela("campeoes")).toHaveLength(0);
  });

  it("apaga pelo id", async () => {
    comoAdmin();
    expect((await del(ID)).status).toBe(204);
    const [c] = naTabela("campeoes");
    expect(c.sql).toContain("delete from public.campeoes");
    expect(c.valores).toEqual([ID]);
  });

  it("id que não é uuid → 400", async () => {
    comoAdmin();
    expect((await del("1 or 1=1")).status).toBe(400);
    expect(naTabela("campeoes")).toHaveLength(0);
  });
});
