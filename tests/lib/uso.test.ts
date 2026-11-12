import { describe, expect, it, vi } from "vitest";
import { comRegistroDeUso } from "@/lib/uso";

// Uma parte por leitura; o erro (conexão caída) só vem depois de lidas todas.
const stream = (partes: string[], erroNoFim?: Error) => {
  const fila = [...partes];
  return new ReadableStream<Uint8Array>({
    pull(c) {
      const p = fila.shift();
      if (p !== undefined) c.enqueue(new TextEncoder().encode(p));
      else if (erroNoFim) c.error(erroNoFim);
      else c.close();
    },
  });
};

const ler = async (partes: string[], erroNoFim?: Error) => {
  const aoTerminar = vi.fn();
  const { corpo, terminou } = comRegistroDeUso(stream(partes, erroNoFim), aoTerminar);
  const saida = await new Response(corpo).text();
  await terminou;
  return { saida, aoTerminar };
};

describe("comRegistroDeUso", () => {
  it("repassa o stream intacto e entrega o usage do último evento", async () => {
    const partes = [
      'data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":900',
      '00,"completion_tokens":800,"cost":0.0081}}\n\ndata: [DONE]\n\n',
    ];
    const { saida, aoTerminar } = await ler(partes);
    expect(saida).toBe(partes.join(""));
    expect(aoTerminar.mock.calls[0][0]).toEqual({ prompt_tokens: 90000, completion_tokens: 800, cost: 0.0081 });
  });

  it("entrega null quando não veio usage", async () => {
    const { aoTerminar } = await ler(["data: [DONE]\n\n"]);
    expect(aoTerminar.mock.calls[0][0]).toBeNull();
  });

  it("junta o texto dos deltas e o último finish_reason", async () => {
    const partes = [
      'data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" amiga"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    ];
    const { saida, aoTerminar } = await ler(partes);
    expect(saida).toBe(partes.join(""));
    expect(aoTerminar.mock.calls[0][1]).toEqual({ texto: "Oi amiga", finishReason: "stop" });
  });

  it("a aluna saiu (F5, outra página): continua lendo até o fim e entrega a resposta inteira", async () => {
    let soltar!: () => void;
    const segura = new Promise<void>((r) => (soltar = r));
    const enc = new TextEncoder();
    const lento = new ReadableStream<Uint8Array>({
      async start(c) {
        c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n'));
        await segura;
        c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":" amiga"},"finish_reason":"stop"}]}\n\n'));
        c.close();
      },
    });
    const aoTerminar = vi.fn();
    const { corpo, terminou } = comRegistroDeUso(lento, aoTerminar);
    const leitor = corpo.getReader();
    await leitor.read();
    await leitor.cancel();
    soltar();
    await terminou;
    expect(aoTerminar.mock.calls[0][1]).toEqual({ texto: "Oi amiga", finishReason: "stop" });
  });

  it("conexão com a OpenRouter caiu no meio: fecha o stream da aluna e entrega o que veio, sem 'stop'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { saida, aoTerminar } = await ler(['data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n'], new Error("caiu"));
    expect(saida).toContain("Oi");
    expect(aoTerminar.mock.calls[0][1]).toEqual({ texto: "Oi", finishReason: null });
  });
});
