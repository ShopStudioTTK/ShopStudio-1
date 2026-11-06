import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buscarVideos, lingua, ordenarVideos } from "@/lib/videos-tiktok";

const r = (url: string, title: string) => ({ url, title });
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

describe("ordenarVideos", () => {
  it("fica só com URLs de vídeo do TikTok e limpa o título", () => {
    const out = ordenarVideos([
      r("https://www.tiktok.com/discover/serum-vitamina-c", "Serum | TikTok"),
      r("https://evil.com/@x/video/123456789012345", "não é tiktok"),
      r("https://www.tiktok.com.evil.com/@x/video/123456789012345", "não é tiktok"),
      r(`${v(1)}?lang=pt`, "Resenha da escova secadora | TikTok"),
    ]);
    expect(out).toEqual([{ url: v(1), titulo: "Resenha da escova secadora", outraLingua: false }]);
  });

  it("português primeiro, mantendo a ordem do buscador; no máximo 2 em outra língua e 6 no total", () => {
    const out = ordenarVideos([
      r(v(1), "Los mejores serums para la piel"),
      r(v(2), "Resenha do sérum que eu amei"),
      r(v(3), "My favorite serum for the skin"),
      r(v(4), "Reseña del serum"),
      r(v(5), "Sérum 30ml"),
      r(v(6), "Vale a pena? Resenha"),
      r(v(7), "Testei por um mês e não larguei"),
      r(v(8), "Minha rotina com esse sérum"),
      r(v(2), "Resenha do sérum que eu amei"),
    ]);
    expect(out.map((x) => x.url)).toEqual([v(2), v(6), v(7), v(8), v(5), v(1)]);
    expect(out.filter((x) => x.outraLingua)).toHaveLength(1);
  });

  it("sem resultados → lista vazia", () => {
    expect(ordenarVideos(undefined)).toEqual([]);
  });
});

describe("buscarVideos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue(brave([r(v(1), "Resenha da garrafa")])) as typeof fetch;
  });

  it("sem BRAVE_API_KEY não busca", async () => {
    vi.stubEnv("BRAVE_API_KEY", "");
    expect(await buscarVideos("garrafa")).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("busca resenhas no TikTok, do Brasil e em português, com a chave no cabeçalho", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    expect(await buscarVideos("garrafa térmica")).toHaveLength(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    const u = new URL(String(url));
    expect(u.origin + u.pathname).toBe("https://api.search.brave.com/res/v1/web/search");
    expect(u.searchParams.get("q")).toBe("site:tiktok.com garrafa térmica resenha");
    expect(u.searchParams.get("country")).toBe("BR");
    expect(u.searchParams.get("search_lang")).toBe("pt-br");
    expect((init as RequestInit).headers).toMatchObject({ "X-Subscription-Token": "k" });
  });

  it("corta o termo em 100 caracteres", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    await buscarVideos("x".repeat(300));
    const q = new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams.get("q")!;
    expect(q).toContain("x".repeat(100));
    expect(q).not.toContain("x".repeat(101));
  });

  it("erro da Brave ou da rede → lista vazia, sem lançar", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    vi.mocked(fetch).mockResolvedValueOnce(new Response("limite", { status: 429 }));
    expect(await buscarVideos("garrafa")).toEqual([]);
    vi.mocked(fetch).mockRejectedValueOnce(new Error("net"));
    expect(await buscarVideos("garrafa")).toEqual([]);
  });
});
