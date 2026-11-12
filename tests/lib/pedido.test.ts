import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "tok" } } }), signOut: vi.fn() } },
}));

import { esperarPedido, esquecer, lembrado, lembrar } from "@/lib/pedido";

const ID = "11111111-2222-3333-4444-555555555555";
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });

beforeEach(() => vi.restoreAllMocks());

describe("esperarPedido (retomar depois do F5)", () => {
  it("pergunta de novo enquanto o servidor responde 202 e devolve o resultado", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(resposta(202, { pendente: true }))
      .mockResolvedValueOnce(resposta(202, { pendente: true }))
      .mockResolvedValueOnce(resposta(200, { texto: "Oi" })) as typeof fetch;
    expect(await esperarPedido(ID, 0)).toEqual({ texto: "Oi" });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`/api/pedidos?id=${ID}`);
  });

  it("falha do pedido (404, 502, 504) vira erro com a mensagem do servidor", async () => {
    global.fetch = vi.fn().mockResolvedValue(resposta(504, { error: { message: "A IA não terminou a tempo." } })) as typeof fetch;
    await expect(esperarPedido(ID, 0)).rejects.toThrow("A IA não terminou a tempo.");
  });
});

describe("lembrar / lembrado / esquecer", () => {
  it("guarda por tipo no sessionStorage e esquece", () => {
    const loja = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => loja.get(k) ?? null,
      setItem: (k: string, v: string) => void loja.set(k, v),
      removeItem: (k: string) => void loja.delete(k),
    });
    lembrar("roteiro", { id: ID });
    expect(lembrado("roteiro")).toEqual({ id: ID });
    expect(lembrado("assistente")).toBeNull();
    esquecer("roteiro");
    expect(lembrado("roteiro")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("sem sessionStorage (bloqueado, servidor): não quebra", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(() => lembrar("roteiro", 1)).not.toThrow();
    expect(lembrado("roteiro")).toBeNull();
    expect(() => esquecer("roteiro")).not.toThrow();
    vi.unstubAllGlobals();
  });
});
