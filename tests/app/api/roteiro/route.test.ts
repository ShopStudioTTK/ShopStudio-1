import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";

const gravou = (inicio: string) => naTabela("ai_perguntas").find((c) => c.sql.startsWith(inicio));

const temAcesso = vi.fn();
vi.mock("@/lib/access", () => ({ temAcesso: (v: boolean) => temAcesso(v) }));

import { POST } from "@/app/api/roteiro/route";

const req = (body: unknown = { produto: "Sérum" }, auth: string | null = "Bearer tok") =>
  new Request("http://x/api/roteiro", {
    method: "POST",
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify(body),
  });

const ia = (content: string) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 12000, completion_tokens: 900, cost: 0.0007, prompt_tokens_details: { cached_tokens: 11000 } },
    }),
  );
const msg = async (res: Response) => (await res.json()).error.message;

type R = Record<string, unknown>[] | Error;
const regras = (o: { entitlements?: R; config?: R; usadas?: number } = {}): [string, R][] => [
  ["from public.entitlements", o.entitlements ?? [{}]],
  ["from public.ai_config", o.config ?? [{ tom: "alegre", persona: null, evitar: null }]],
  ["from public.ai_knowledge", [{ titulo: "t", conteudo: "c" }]],
  ["as usadas", [{ usadas: o.usadas ?? 0 }]],
  ["insert into public.ai_perguntas", [{ id: "r1" }]],
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("OPENROUTER_API_KEY", "chave-teste");
  vi.stubEnv("OPENROUTER_MODEL", "modelo/teste");
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  temAcesso.mockReset().mockReturnValue(true);
  reiniciarDb();
  responderCom(regras());
  vi.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = vi.fn().mockResolvedValue(ia('{"ganchos":["a"]}')) as typeof fetch;
});

describe("POST /api/roteiro", () => {
  it("500 sem env, antes de getUser e fetch", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(await msg(res)).toBe("IA não configurada.");
    expect(getUser).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("500 sem modelo", async () => {
    vi.stubEnv("OPENROUTER_MODEL", "");
    expect((await POST(req())).status).toBe(500);
  });

  it("401 sem Bearer", async () => {
    const res = await POST(req(undefined, null));
    expect(res.status).toBe(401);
    expect(await msg(res)).toBe("Faça login para gerar roteiros.");
  });

  it("401 com token inválido", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad" } });
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(await msg(res)).toBe("Faça login para gerar roteiros.");
  });

  it("403 sem acesso", async () => {
    temAcesso.mockReturnValue(false);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(await msg(res)).toBe("Seu acesso ainda não foi liberado.");
  });

  it("temAcesso recebe true com entitlement e false sem", async () => {
    await POST(req());
    expect(temAcesso).toHaveBeenLastCalledWith(true);
    responderCom(regras({ entitlements: [] }));
    await POST(req());
    expect(temAcesso).toHaveBeenLastCalledWith(false);
  });

  it("500 quando a leitura do entitlement falha", async () => {
    responderCom(regras({ entitlements: new Error("db") }));
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(await msg(res)).toBe("Não consegui verificar seu acesso agora.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("limita campos a 500 caracteres", async () => {
    await POST(req({ produto: "x".repeat(600) }));
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    const user = body.messages[1].content as string;
    expect(user).toContain("x".repeat(500));
    expect(user).not.toContain("x".repeat(501));
  });

  it("400 sem produto", async () => {
    const res = await POST(req({ produto: "  " }));
    expect(res.status).toBe(400);
    expect(await msg(res)).toBe("Diga qual é o produto.");
  });

  it("502 com erro da OpenRouter", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: "sem crédito" } }), { status: 402 }));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("sem crédito");
  });

  it("502 com mensagem padrão quando a OpenRouter não explica", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("boom", { status: 500 }));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("Não consegui gerar o roteiro agora.");
  });

  it("502 com resposta sem JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(ia("sem json"));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("A resposta da IA veio em formato inesperado. Tente de novo.");
  });

  it("200 chama a OpenRouter uma vez e devolve o JSON", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ganchos: ["a"], videos: [] });
    expect(fetch).toHaveBeenCalledTimes(1); // sem BRAVE_API_KEY, não busca vídeos
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const i = init as RequestInit;
    expect(JSON.parse(i.body as string).model).toBe(process.env.OPENROUTER_MODEL);
    expect(JSON.parse(i.body as string).max_tokens).toBe(4000);
    expect(JSON.parse(i.body as string).provider).toEqual({
      order: ["morph/fp8", "deepinfra/fp8"],
      quantizations: ["fp8"],
    });
    expect((i.headers as Record<string, string>).Authorization).toBe("Bearer chave-teste");
  });

  it("502 quando o fetch da OpenRouter lança", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("Não consegui gerar o roteiro agora.");
  });

  it("500 em JSON quando getUser lança", async () => {
    getUser.mockRejectedValue(new Error("net"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    expect(typeof (await msg(res))).toBe("string");
  });

  it("502 quando a resposta foi cortada por tamanho", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: '{"ganchos":' } }] })),
    );
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("A resposta da IA veio cortada. Tente de novo.");
  });

  it("segue sem treino se as leituras opcionais falham", async () => {
    responderCom(regras({ config: new Error("x") }));
    expect((await POST(req())).status).toBe(200);
  });

  it("429 ao atingir 10 roteiros no dia, sem gravar nem chamar a IA", async () => {
    responderCom(regras({ usadas: 10 }));
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(await msg(res)).toBe("Você gerou os 10 roteiros de hoje. Amanhã tem mais.");
    expect(gravou("insert")).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("grava a geração como rota roteiro e registra tokens e custo", async () => {
    const res = await POST(req({ produto: "Sérum" }));
    expect(res.status).toBe(200);
    expect(gravou("insert")?.valores).toEqual(["u1", "roteiro", "Sérum", null]);
    expect(gravou("update")?.valores).toEqual([12000, 900, 11000, 0.0007, "r1"]);
  });

  it("com BRAVE_API_KEY, devolve junto os vídeos do TikTok sobre o produto", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    const video = "https://www.tiktok.com/@c/video/7368550087632375046";
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).startsWith("https://api.search.brave.com")
        ? new Response(JSON.stringify({ web: { results: [{ url: video, title: "Resenha do sérum" }] } }))
        : ia('{"ganchos":["a"]}'),
    );
    const res = await POST(req());
    expect(await res.json()).toEqual({
      ganchos: ["a"],
      videos: [{ url: video, titulo: "Resenha do sérum", outraLingua: false }],
    });
  });

  it("falha na busca de vídeos não derruba o roteiro", async () => {
    vi.stubEnv("BRAVE_API_KEY", "k");
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).startsWith("https://api.search.brave.com")) throw new Error("net");
      return ia('{"ganchos":["a"]}');
    });
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ganchos: ["a"], videos: [] });
  });

  it("geração que falhou não conta no limite", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    await POST(req());
    expect(gravou("delete")?.valores).toEqual(["r1"]);
  });
});
