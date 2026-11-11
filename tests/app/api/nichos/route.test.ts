import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { consultas, getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";
import { DELETE, GET, POST } from "@/app/api/nichos/route";
import { slugDe } from "@/lib/entrada";

const comToken = { Authorization: "Bearer tok", "Content-Type": "application/json" };
const post = (body: unknown) =>
  POST(new Request("http://x/api/nichos", { method: "POST", headers: comToken, body: JSON.stringify(body) }));
const del = (slug: string) =>
  DELETE(new Request(`http://x/api/nichos?slug=${encodeURIComponent(slug)}`, { method: "DELETE", headers: comToken }));

const comoAdmin = (extra: [string, Record<string, unknown>[]][] = []) =>
  responderCom([["from public.entitlements", [{}]], ["from public.admins", [{}]], ...extra]);

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  responderCom([["from public.entitlements", [{}]]]);
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("slugDe", () => {
  it("sem acento, minúsculo e com hífen", () => {
    expect(slugDe("  Casa & Cozinha ")).toBe("casa-cozinha");
    expect(slugDe("Pet Shop 🐶")).toBe("pet-shop");
    expect(slugDe("Maquiagem — Pele Oleosa")).toBe("maquiagem-pele-oleosa");
    expect(slugDe("!!!")).toBe("");
  });
});

describe("GET /api/nichos", () => {
  it("ordem fixa: moda fitness, moda feminina, beleza, casa e cozinha, suplementos; depois as outras, por criação", async () => {
    const nichos = [{ slug: "beleza", rotulo: "Beleza e autocuidado" }];
    responderCom([["from public.entitlements", [{}]], ["from public.nichos", nichos]]);
    const res = await GET(new Request("http://x/api/nichos", { headers: comToken }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ nichos });
    const { sql, valores } = naTabela("nichos")[0];
    expect(sql).toContain("order by array_position(?::text[], slug) nulls last, criado_em");
    expect(valores[0]).toEqual(["moda-fitness", "moda-feminina", "beleza", "casa-e-cozinha", "suplementos"]);
  });
});

describe("POST /api/nichos (só admin)", () => {
  it("aluna fora de admins → 403, e o corpo nem é lido antes da checagem", async () => {
    expect((await post({ rotulo: "Pet" })).status).toBe(403);
    expect(naTabela("nichos")).toHaveLength(0);
    // a última consulta é a checagem de admin: nada foi gravado depois dela
    expect(consultas.at(-1)?.sql).toContain("public.admins");
  });

  it("cria a aba com o slug do rótulo", async () => {
    comoAdmin([["insert into public.nichos", [{ slug: "pet-shop", rotulo: "Pet Shop" }]]]);
    const res = await post({ rotulo: "  Pet Shop " });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ nicho: { slug: "pet-shop", rotulo: "Pet Shop" } });
    expect(naTabela("nichos")[0].valores).toEqual(["pet-shop", "Pet Shop"]);
  });

  it("rótulo vazio ou sem letra/número → 400", async () => {
    comoAdmin();
    for (const rotulo of ["", "   ", "!!!", undefined, 42]) expect((await post({ rotulo })).status).toBe(400);
    expect(naTabela("nichos")).toHaveLength(0);
  });

  it("aba que já existe → 409", async () => {
    comoAdmin(); // on conflict do nothing: sem linha
    expect((await post({ rotulo: "Beleza" })).status).toBe(409);
  });
});

describe("DELETE /api/nichos (só admin)", () => {
  it("aluna fora de admins → 403, sem apagar", async () => {
    expect((await del("beleza")).status).toBe(403);
    expect(naTabela("nichos")).toHaveLength(0);
  });

  it("apaga a aba vazia", async () => {
    comoAdmin([["delete from public.nichos", [{ slug: "pet" }]]]);
    expect((await del("pet")).status).toBe(204);
    const [c] = naTabela("nichos");
    expect(c.valores).toEqual(["pet"]);
    expect(c.sql).toContain("not exists"); // só apaga se não tiver vídeo
  });

  it("aba com vídeos (ou que não existe) → 409", async () => {
    comoAdmin();
    expect((await del("beleza")).status).toBe(409);
  });

  it("slug fora do formato → 400", async () => {
    comoAdmin();
    expect((await del("a b'; drop")).status).toBe(400);
    expect(naTabela("nichos")).toHaveLength(0);
  });
});
