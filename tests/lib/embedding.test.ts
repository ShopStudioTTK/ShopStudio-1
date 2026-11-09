import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { gerarEmbedding } from "@/lib/embedding";

const vetor = Array.from({ length: 1536 }, (_, i) => i / 1536);
const ok = (embedding: number[] = vetor) => new Response(JSON.stringify({ data: [{ embedding }] }));

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("OPENROUTER_API_KEY", "chave");
  vi.stubEnv("OPENROUTER_EMBEDDING_MODEL", "");
  global.fetch = vi.fn().mockResolvedValue(ok()) as typeof fetch;
});

describe("gerarEmbedding", () => {
  it("chama a OpenRouter com a chave e o modelo padrão", async () => {
    expect(await gerarEmbedding("oi")).toEqual(vetor);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/embeddings");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer chave");
    expect(JSON.parse(init!.body as string)).toEqual({ model: "openai/text-embedding-3-small", input: "oi" });
    expect(init!.signal).toBeInstanceOf(AbortSignal);
  });

  it("usa OPENROUTER_EMBEDDING_MODEL quando definido", async () => {
    vi.stubEnv("OPENROUTER_EMBEDDING_MODEL", "outro/modelo");
    await gerarEmbedding("oi");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).model).toBe("outro/modelo");
  });

  it("sem chave lança sem chamar a OpenRouter", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    await expect(gerarEmbedding("oi")).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lança com erro da OpenRouter ou vetor de outro tamanho", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 500 }));
    await expect(gerarEmbedding("oi")).rejects.toThrow();
    vi.mocked(fetch).mockResolvedValueOnce(ok([1, 2, 3]));
    await expect(gerarEmbedding("oi")).rejects.toThrow();
  });
});
