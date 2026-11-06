import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));
const buscarCampeoes = vi.fn();
vi.mock("@/lib/videos-tiktok", () => ({ buscarCampeoes: (n: string) => buscarCampeoes(n) }));

import { getUser, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { GET } from "@/app/api/campeoes/route";

const req = (nicho?: string) =>
  new Request(`http://x/api/campeoes${nicho ? `?nicho=${nicho}` : ""}`, { headers: { Authorization: "Bearer tok" } });

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  responderCom([["from public.entitlements", [{}]]]);
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("GET /api/campeoes", () => {
  it("devolve os vídeos do nicho", async () => {
    const videos = [{ url: "https://www.tiktok.com/@a/video/1", titulo: "t", outraLingua: false }];
    buscarCampeoes.mockResolvedValue(videos);
    const res = await GET(req("beleza"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ videos });
    expect(buscarCampeoes).toHaveBeenCalledWith("beleza");
  });

  it("nicho que não existe → 400, sem buscar", async () => {
    for (const r of [req(), req("xyz")]) expect((await GET(r)).status).toBe(400);
    expect(buscarCampeoes).not.toHaveBeenCalled();
  });
});
