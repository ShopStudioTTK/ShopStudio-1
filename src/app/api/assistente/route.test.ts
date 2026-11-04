import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/conhecimento/material", () => ({ DOSSIE: "D", TRANSCRICAO: "T" }));

const getUser = vi.fn();
const tables: Record<string, { data: unknown; error?: unknown }> = {};
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { getUser },
    from: (t: string) => {
      const r = () => Promise.resolve(tables[t] ?? { data: null, error: null });
      const q = { select: () => q, eq: () => q, maybeSingle: r, order: r };
      return q;
    },
  }),
}));

const temAcesso = vi.fn();
vi.mock("@/lib/access", () => ({ temAcesso: (v: boolean) => temAcesso(v) }));

import { POST } from "./route";

const conversa = [{ role: "user", content: "Como pedir amostra?" }];
const req = (body: unknown = { messages: conversa }, auth: string | null = "Bearer tok") =>
  new Request("http://x/api/assistente", {
    method: "POST",
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify(body),
  });
const msg = async (res: Response) => (await res.json()).error.message;
const sse = 'data: {"choices":[{"delta":{"content":"Oi"}}]}\n\ndata: [DONE]\n\n';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("OPENROUTER_API_KEY", "chave-teste");
  vi.stubEnv("OPENROUTER_MODEL", "modelo/teste");
  getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  temAcesso.mockReset().mockReturnValue(true);
  for (const k of Object.keys(tables)) delete tables[k];
  tables.entitlements = { data: { user_id: "u1" } };
  vi.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = vi.fn().mockResolvedValue(new Response(sse, { headers: { "Content-Type": "text/event-stream" } })) as typeof fetch;
});

describe("POST /api/assistente", () => {
  it("401 sem token, com a mensagem do assistente", async () => {
    const res = await POST(req(undefined, null));
    expect(res.status).toBe(401);
    expect(await msg(res)).toBe("Faça login para usar o assistente.");
  });

  it("403 sem acesso", async () => {
    temAcesso.mockReturnValue(false);
    expect((await POST(req())).status).toBe(403);
  });

  it("400 sem pergunta da usuária no fim", async () => {
    const res = await POST(req({ messages: [] }));
    expect(res.status).toBe(400);
    expect(await msg(res)).toBe("Escreva sua dúvida.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("repassa o stream da OpenRouter com stream:true e o capítulo no prompt", async () => {
    const res = await POST(req({ messages: conversa, chapterTitle: "Amostras" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    expect(await res.text()).toBe(sse);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    expect(body.stream).toBe(true);
    expect(body.model).toBe("modelo/teste");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain('capítulo "Amostras"');
    expect(body.messages.slice(1)).toEqual(conversa);
  });

  it("502 com a mensagem da OpenRouter quando ela recusa", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: { message: "sem créditos" } }, { status: 402 }));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("sem créditos");
  });

  it("502 quando a chamada falha na rede", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    const res = await POST(req());
    expect(res.status).toBe(502);
    expect(await msg(res)).toBe("Não consegui responder agora. Tente de novo.");
  });
});
