import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../apoio/db-falso");
  return { db: () => b.sqlFalso };
});

import { naTabela, reiniciarDb, responderCom } from "../apoio/db-falso";
import { buscarVideos, engajamento, lingua, normalizarTermo, ordenarVideos, relevante } from "@/lib/videos-tiktok";

const r = (url: string, title: string, extra?: string) => ({ url, title, extra_snippets: extra ? [extra] : undefined });
const v = (n: number) => `https://www.tiktok.com/@c${n}/video/7${String(n).padStart(18, "0")}`;
const brave = (results: unknown[]) => new Response(JSON.stringify({ web: { results } }));

describe("lingua (pelo título)", () => {
  it.each([
    ["Resenha completa da Air Fryer e forno Oster 25L", "pt"],
    ["Vitamina c de R$400 x R$60 e ai? Qual será que é melhor?", "pt"],
    ["A Air Fryer tem mil e uma utilidades, mas fritar não é uma delas", "pt"],
    ["Los mejores serums económicos . Serum vitamina C pura", "outra"],
    ["Reseña Serum Vitamina C Dermaglos", "outra"],
    ["Air Fryer Basics! My new series where I show you how to", "outra"],
    ["AirFryer 3x1 Oster", "?"],
  ])("%s → %s", (titulo, esperado) => {
    expect(lingua(titulo)).toBe(esperado);
  });
});

describe("engajamento (texto que o TikTok publica na página)", () => {
  it.each([
    ["19.1K Likes, 120 Comments. TikTok video from Viluma", 19100 + 3 * 120],
    ["1199 Likes, 35 Comments.", 1199 + 3 * 35],
    ["1.2M Likes, 4.3K Comments.", 1_200_000 + 3 * 4300],
    ["1,234 Likes, 5 Comments.", 1234 + 15],
    ["Resenha da minha air fryer", null],
  ])("%s → %s", (texto, esperado) => {
    expect(engajamento(texto)).toBe(esperado);
  });
});

describe("normalizarTermo", () => {
  it.each([
    ["Sérum de Vitamina C", "c serum vitamina"],
    ["sérum vitamina c", "c serum vitamina"],
    ["Pijamas Femininos", "feminino pijama"],
    ["Kit garrafa térmica da Stanley", "garrafa stanley termica"],
    ["  air   fryer!! ", "air fryer"],
    ["gás", "gas"],
  ])("%s → %s", (termo, esperado) => {
    expect(normalizarTermo(termo)).toBe(esperado);
  });
});

describe("relevante", () => {
  it("exige ao menos 60% das palavras do produto, sem acento nem plural", () => {
    expect(relevante("pijama feminino", "Conjunto de PIJAMAS femininos quentinho")).toBe(true);
    expect(relevante("pijama feminino", "Nova fragrância feminina: resenha")).toBe(false);
    expect(relevante("Sérum Vitamina C", "o serum de vitamina que testei")).toBe(true);
    expect(relevante("garrafa térmica stanley 1 litro", "garrafa termica que dura o dia")).toBe(false);
    expect(relevante("garrafa térmica stanley 1 litro", "a garrafa térmica stanley vale?")).toBe(true);
  });

  it("produto sem palavra de 3 letras não filtra nada", () => {
    expect(relevante("C", "qualquer coisa")).toBe(true);
  });
});

describe("ordenarVideos", () => {
  const curt = (n: number) => `${n} Likes, 0 Comments.`;

  it("fica só com URLs de vídeo do TikTok e limpa o título", () => {
    const out = ordenarVideos(
      [
        r("https://www.tiktok.com/discover/escova-secadora", "Escova secadora | TikTok"),
        r("https://evil.com/@x/video/123456789012345", "escova secadora não é tiktok"),
        r("https://www.tiktok.com.evil.com/@x/video/123456789012345", "escova secadora não é tiktok"),
        r(`${v(1)}?lang=pt`, "Resenha da escova secadora | TikTok"),
      ],
      "escova secadora",
    );
    expect(out).toEqual([{ url: v(1), titulo: "Resenha da escova secadora", outraLingua: false }]);
  });

  it("descarta vídeo que não fala do produto", () => {
    const out = ordenarVideos([r(v(1), "Resenha do perfume", curt(9000)), r(v(2), "Meu pijama favorito")], "pijama");
    expect(out.map((x) => x.url)).toEqual([v(2)]);
  });

  it("mais engajamento primeiro; sem número no fim; outra língua depois e no máximo 2; 6 no total", () => {
    const out = ordenarVideos(
      [
        r(v(1), "Los mejores serums para la piel", curt(900000)),
        r(v(2), "Resenha do sérum que eu amei", curt(100)),
        r(v(3), "My favorite serum for the skin", curt(800000)),
        r(v(4), "Reseña del serum", curt(700000)),
        r(v(5), "Sérum 30ml", curt(5000)),
        r(v(6), "Vale a pena esse sérum? Resenha"),
        r(v(7), "Testei o sérum por um mês", curt(20000)),
        r(v(8), "Minha rotina com esse sérum", curt(300)),
        r(v(2), "Resenha do sérum que eu amei", curt(100)),
      ],
      "sérum",
    );
    expect(out.map((x) => x.url)).toEqual([v(7), v(5), v(8), v(2), v(6), v(1)]);
    expect(out.filter((x) => x.outraLingua)).toHaveLength(1);
  });

  it("lê o número no título, na descrição ou nos trechos extras", () => {
    const out = ordenarVideos(
      [
        { url: v(1), title: "garrafa A", description: curt(10) },
        { url: v(2), title: "garrafa B", extra_snippets: ["outra coisa", curt(50)] },
      ],
      "garrafa",
    );
    expect(out.map((x) => x.url)).toEqual([v(2), v(1)]);
  });

  it("sem resultados → lista vazia", () => {
    expect(ordenarVideos(undefined, "x")).toEqual([]);
  });
});

describe("buscarVideos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    reiniciarDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn(async () => brave([r(v(1), "Resenha da garrafa térmica")])) as typeof fetch;
  });

  it("sem BRAVE_API_KEY não busca", async () => {
    vi.stubEnv("BRAVE_API_KEY", "");
    expect(await buscarVideos("garrafa")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("faz 3 buscas no TikTok (Brasil, português, só vídeos, com trechos extras) e junta sem repetir", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    expect(await buscarVideos("garrafa térmica")).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    const qs = vi.mocked(fetch).mock.calls.map(([url, init]) => {
      const u = new URL(String(url));
      expect(u.origin + u.pathname).toBe("https://api.search.brave.com/res/v1/web/search");
      expect(u.searchParams.get("country")).toBe("BR");
      expect(u.searchParams.get("search_lang")).toBe("pt-br");
      expect(u.searchParams.get("extra_snippets")).toBe("true");
      expect(u.searchParams.get("goggles")).toContain("$discard");
      expect((init as RequestInit).headers).toMatchObject({ "X-Subscription-Token": "k" });
      return u.searchParams.get("q");
    });
    expect(qs).toEqual([
      'site:tiktok.com garrafa térmica (resenha OR "vale a pena" OR testei)',
      "site:tiktok.com garrafa térmica (achadinho OR comprei OR amei)",
      "site:tiktok.com garrafa térmica (review OR unboxing OR favorito)",
    ]);
  });

  it("corta o termo em 100 caracteres", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    await buscarVideos("x".repeat(300));
    const q = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams.get("q")!;
    expect(q).toContain("x".repeat(100));
    expect(q).not.toContain("x".repeat(101));
  });

  it("uma busca que falha não perde as outras", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error("net"))
      .mockResolvedValueOnce(new Response("limite", { status: 429 }))
      .mockResolvedValueOnce(brave([r(v(2), "Comprei a garrafa")]));
    expect((await buscarVideos("garrafa")).map((x) => x.url)).toEqual([v(2)]);
  });

  it("erro da Brave ou da rede → lista vazia, sem lançar", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    vi.mocked(fetch).mockResolvedValue(new Response("limite", { status: 429 }));
    expect(await buscarVideos("garrafa")).toEqual([]);
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    expect(await buscarVideos("garrafa")).toEqual([]);
  });

  describe("cache compartilhado (videos_cache)", () => {
    const salvos = [{ url: v(9), titulo: "Garrafa térmica que eu amo", outraLingua: false }];

    it("termo parecido salvo há menos de 3 dias: devolve do banco, sem chamar a Brave", async () => {
      vi.stubEnv("BRAVE_API_KEY", "k");
      responderCom([["from public.videos_cache", [{ videos: salvos }]]]);
      expect(await buscarVideos("Garrafa Térmica")).toEqual(salvos);
      expect(fetch).not.toHaveBeenCalled();
      const [busca] = naTabela("videos_cache");
      expect(busca.sql).toMatch(/^select videos from/);
      expect(busca.sql).toContain("interval '3 days'");
      expect(busca.sql).toContain("extensions.similarity(termo, ?)");
      expect(busca.valores).toEqual(["garrafa termica", 0.7, "garrafa termica"]);
    });

    it("sem nada parecido: busca na Brave e grava pelo termo normalizado", async () => {
      vi.stubEnv("BRAVE_API_KEY", "k");
      const out = await buscarVideos("Garrafa Térmica");
      expect(out).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(3);
      const grava = naTabela("videos_cache")[1];
      expect(grava.sql).toContain("insert into public.videos_cache");
      expect(grava.sql).toContain("on conflict (termo) do update");
      expect(grava.valores).toEqual(["garrafa termica", JSON.stringify(out)]);
    });

    it("não grava lista vazia (falha da Brave não fica presa 3 dias)", async () => {
      vi.stubEnv("BRAVE_API_KEY", "k");
      vi.mocked(fetch).mockRejectedValue(new Error("net"));
      expect(await buscarVideos("garrafa")).toEqual([]);
      expect(naTabela("videos_cache")).toHaveLength(1);
    });

    it("banco fora do ar: busca na Brave mesmo assim, sem lançar", async () => {
      vi.stubEnv("BRAVE_API_KEY", "k");
      responderCom([["videos_cache", new Error("db")]]);
      expect(await buscarVideos("garrafa térmica")).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("termo sem palavra útil não usa o cache", async () => {
      vi.stubEnv("BRAVE_API_KEY", "k");
      await buscarVideos("de");
      expect(naTabela("videos_cache")).toHaveLength(0);
    });
  });
});
