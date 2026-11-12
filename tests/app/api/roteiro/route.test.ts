import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", async () => {
  const b = await import("../../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../../apoio/db-falso")).adminFalso);
import { getUser, naTabela, reiniciarDb, responderCom } from "../../../apoio/db-falso";

const gravou = (inicio: string) => naTabela("ai_perguntas").find((c) => c.sql.startsWith(inicio));
const creditos = (inicio: string) => naTabela("creditos_semana").filter((c) => c.sql.startsWith(inicio));

const temAcesso = vi.fn();
vi.mock("@/lib/access", () => ({ temAcesso: (v: boolean) => temAcesso(v) }));

const buscarParecidas = vi.fn();
const buscarDoMesmoJeito = vi.fn();
const listarGatilhos = vi.fn();
const listarExemplosFixos = vi.fn();
vi.mock("@/lib/fichas", async (original) => ({
  ...(await original<typeof import("@/lib/fichas")>()),
  buscarParecidas: (p: string) => buscarParecidas(p),
  buscarDoMesmoJeito: (f: string, g: string, e: string[]) => buscarDoMesmoJeito(f, g, e),
  listarGatilhos: () => listarGatilhos(),
  listarExemplosFixos: () => listarExemplosFixos(),
}));

import { POST } from "@/app/api/roteiro/route";
import type { FichaCartao } from "@/lib/fichas-tipos";
import { semanaSP } from "@/lib/limite";

const ficha = (o: Partial<FichaCartao> = {}): FichaCartao => ({
  id: "f1", produto: "Sérum Principia", tipo: "skincare", formato: "Unboxing",
  gatilho: { slug: "fofoca", rotulo: "Fofoca" },
  gancho: { texto: "g", porque: "PORQUE-DA-ANA", entonacao: "baixinho" },
  problema: { texto: "p", porque: null, entonacao: null },
  solucao: { texto: "s", porque: null, entonacao: null },
  cta: { texto: "c", porque: null, entonacao: null },
  ...o,
});

const req = (body: unknown = { produto: "Sérum" }, auth: string | null = "Bearer tok") =>
  new Request("http://x/api/roteiro", {
    method: "POST",
    headers: auth ? { Authorization: auth } : {},
    body: JSON.stringify(body),
  });

const ia = (content: string, saida = 900) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 12000, completion_tokens: saida, cost: 0.0007, prompt_tokens_details: { cached_tokens: 11000 } },
    }),
  );
const msg = async (res: Response) => (await res.json()).error.message;

type R = Record<string, unknown>[] | Error;
const regras = (o: { entitlements?: R; config?: R; semCredito?: boolean; admins?: R } = {}): [string, R][] => [
  ["from public.entitlements", o.entitlements ?? [{}]],
  ["from public.admins", o.admins ?? []],
  ["from public.ai_config", o.config ?? [{ tom: "alegre", persona: null, evitar: null }]],
  ["insert into public.creditos_semana", o.semCredito ? [] : [{ gastos: 1 }]],
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
  buscarParecidas.mockReset().mockResolvedValue([]);
  buscarDoMesmoJeito.mockReset().mockResolvedValue([]);
  listarExemplosFixos.mockReset().mockResolvedValue([]);
  listarGatilhos.mockReset().mockResolvedValue([{ slug: "fofoca", rotulo: "Fofoca" }, { slug: "choque", rotulo: "Choque (quebra de padrão)" }]);
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

  it("preço opcional vai para o pedido à IA, cortado em 40 caracteres", async () => {
    await POST(req({ produto: "Babydoll", preco: "R$ 59,90" + " ".repeat(10) + "x".repeat(60) }));
    const user = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).messages[1].content as string;
    expect(user).toContain("Preço: R$ 59,90");
    expect(user).not.toContain("x".repeat(30));
    vi.mocked(fetch).mockClear();
    await POST(req({ produto: "Babydoll" }));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).messages[1].content).toContain("Preço: não informado");
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
    // a IA respondeu (o custo fica registrado), mas a aluna não recebeu roteiro: o crédito volta
    expect(gravou("update")?.valores).toEqual([12000, 900, 11000, 0.0007, "r1"]);
    expect(creditos("update")[0].valores).toEqual([40, -1, "u1", semanaSP()]);
  });

  it("200 chama a OpenRouter uma vez e devolve o JSON", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ganchos: ["a"], gatilho: "", fichas: { parecidas: [], mesmoJeito: [] } });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const i = init as RequestInit;
    expect(JSON.parse(i.body as string).model).toBe(process.env.OPENROUTER_MODEL);
    expect(JSON.parse(i.body as string).max_tokens).toBe(4000);
    expect(JSON.parse(i.body as string).provider).toEqual({
      order: ["deepinfra/fp8", "morph/fp8"],
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
    expect(creditos("update")[0].valores).toEqual([40, -1, "u1", semanaSP()]);
  });

  it("segue sem treino se as leituras opcionais falham", async () => {
    responderCom(regras({ config: new Error("x") }));
    expect((await POST(req())).status).toBe(200);
  });

  it("429 sem créditos na semana, sem gravar nem chamar a IA", async () => {
    responderCom(regras({ semCredito: true }));
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(await msg(res)).toBe("Seus créditos da semana acabaram. Domingo tem mais.");
    expect(gravou("insert")).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("grava a geração como rota roteiro e registra tokens e custo", async () => {
    const res = await POST(req({ produto: "Sérum" }));
    expect(res.status).toBe(200);
    expect(gravou("insert")?.valores).toEqual(["u1", "roteiro", "Sérum", null]);
    expect(gravou("update")?.valores).toEqual([12000, 900, 11000, 0.0007, "r1"]);
    expect(creditos("insert")[0].valores).toEqual(["u1", semanaSP(), 40]);
    // 900 tokens de saída: fica no 1 crédito reservado
    expect(creditos("update")).toHaveLength(0);
  });

  it("roteiro maior cobra meio crédito a mais", async () => {
    vi.mocked(fetch).mockResolvedValue(ia('{"ganchos":["a"]}', 2410));
    expect((await POST(req())).status).toBe(200);
    expect(creditos("update")[0].valores).toEqual([40, 0.5, "u1", semanaSP()]);
  });

  it("geração que falhou não gasta crédito", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("net"));
    await POST(req());
    expect(gravou("delete")?.valores).toEqual(["r1"]);
    expect(creditos("update")[0].valores).toEqual([40, -1, "u1", semanaSP()]);
  });

  describe("fichas da expert", () => {
    it("normaliza o gatilho e monta os dois cartões sem repetir fichas", async () => {
      buscarParecidas.mockResolvedValue([ficha({ id: "f1", similaridade: 0.8 })]);
      buscarDoMesmoJeito.mockResolvedValue([ficha({ id: "f2" })]);
      vi.mocked(fetch).mockResolvedValue(ia('{"ganchos":["a"],"gatilho":"Fofoca"}'));
      const json = await (await POST(req({ produto: "Sérum", formato: "Unboxing" }))).json();
      expect(json.gatilho).toBe("fofoca");
      expect(buscarParecidas).toHaveBeenCalledWith("Sérum");
      expect(buscarDoMesmoJeito).toHaveBeenCalledWith("Unboxing", "fofoca", ["f1"]);
      expect(json.fichas).toEqual({
        parecidas: [expect.objectContaining({ id: "f1" })],
        mesmoJeito: [expect.objectContaining({ id: "f2" })],
      });
    });

    it("as fichas ≥ 0,80 e a lista de gatilhos vão no prompt de sistema, depois do dossiê", async () => {
      buscarParecidas.mockResolvedValue([ficha({ similaridade: 0.85 })]);
      await POST(req());
      const system = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).messages[0].content as string;
      expect(system).toContain("PORQUE-DA-ANA");
      expect(system).toContain("choque");
      expect(system.indexOf("PORQUE-DA-ANA")).toBeGreaterThan(system.indexOf("DOSSIÊ DA ESPECIALISTA"));
    });

    it("as fichas marcadas como exemplo fixo de voz vão no prompt de todo roteiro; falha na leitura = roteiro igual", async () => {
      listarExemplosFixos.mockResolvedValue([ficha({ id: "fx", produto: "Papete de brilho" })]);
      await POST(req());
      const system = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).messages[0].content as string;
      expect(system).toContain("EXEMPLOS DE VOZ DA ANA");
      expect(system).toContain("Papete de brilho");
      vi.mocked(fetch).mockClear().mockResolvedValue(ia('{"ganchos":["a"]}'));
      listarExemplosFixos.mockRejectedValue(new Error("db"));
      expect((await POST(req())).status).toBe(200);
    });

    it("gatilho fora da lista → vazio, sem cartão 2", async () => {
      vi.mocked(fetch).mockResolvedValue(ia('{"ganchos":["a"],"gatilho":"drama"}'));
      const json = await (await POST(req({ produto: "Sérum", formato: "Unboxing" }))).json();
      expect(json.gatilho).toBe("");
      expect(buscarDoMesmoJeito).toHaveBeenCalledWith("Unboxing", "", []);
    });

    it("busca de gatilhos e do cartão 2 falhando → roteiro sai igual, com cartões vazios", async () => {
      listarGatilhos.mockRejectedValue(new Error("db"));
      buscarDoMesmoJeito.mockRejectedValue(new Error("db"));
      vi.mocked(fetch).mockResolvedValue(ia('{"ganchos":["a"],"gatilho":"fofoca"}'));
      const res = await POST(req({ produto: "Sérum", formato: "Unboxing" }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ganchos: ["a"], gatilho: "", fichas: { parecidas: [], mesmoJeito: [] } });
    });
  });

  describe("admin", () => {
    const system = () => JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).messages[0].content as string;

    it("admin não gasta créditos, mas a geração continua registrada", async () => {
      responderCom(regras({ semCredito: true, admins: [{}] }));
      vi.mocked(fetch).mockResolvedValue(ia('{"ganchos":["a"]}', 2410));
      const res = await POST(req());
      expect(res.status).toBe(200);
      expect(gravou("insert")?.valores).toEqual(["u1", "roteiro", "Sérum", null]);
      expect(naTabela("creditos_semana")).toHaveLength(0);
    });

    it("rascunho da admin pede tipo, porquê e entonação, depois do dossiê, e devolve o que a IA mandou", async () => {
      responderCom(regras({ admins: [{}] }));
      const explicacao = { gancho: { porque: "pq", entonacao: "baixinho" } };
      vi.mocked(fetch).mockResolvedValue(ia(JSON.stringify({ ganchos: ["a"], tipo: "skincare", explicacao })));
      const json = await (await POST(req({ produto: "Sérum", rascunho: true }))).json();
      expect(system()).toContain("RASCUNHO PARA A ESPECIALISTA");
      expect(system().indexOf("RASCUNHO PARA A ESPECIALISTA")).toBeGreaterThan(system().indexOf("DOSSIÊ DA ESPECIALISTA"));
      expect(json).toMatchObject({ tipo: "skincare", explicacao });
    });

    it("aluna que pede rascunho recebe o roteiro de sempre", async () => {
      await POST(req({ produto: "Sérum", rascunho: true }));
      expect(system()).not.toContain("RASCUNHO PARA A ESPECIALISTA");
    });

    it("aluna que pede rascunho continua nos créditos", async () => {
      responderCom(regras({ semCredito: true }));
      expect((await POST(req({ produto: "Sérum", rascunho: true }))).status).toBe(429);
    });

    it("admins fora do ar → segue como aluna, com créditos", async () => {
      responderCom(regras({ semCredito: true, admins: new Error("db") }));
      expect((await POST(req())).status).toBe(429);
    });

    it("admin sem pedir rascunho recebe o roteiro de sempre", async () => {
      responderCom(regras({ admins: [{}] }));
      await POST(req());
      expect(system()).not.toContain("RASCUNHO PARA A ESPECIALISTA");
    });
  });
});
