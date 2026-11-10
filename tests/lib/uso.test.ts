import { describe, expect, it, vi } from "vitest";
import { comRegistroDeUso } from "@/lib/uso";

const stream = (partes: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of partes) c.enqueue(new TextEncoder().encode(p));
      c.close();
    },
  });

describe("comRegistroDeUso", () => {
  it("repassa o stream intacto e entrega o usage do último evento", async () => {
    const partes = [
      'data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":900',
      '00,"completion_tokens":800,"cost":0.0081}}\n\ndata: [DONE]\n\n',
    ];
    const aoTerminar = vi.fn();
    const saida = await new Response(comRegistroDeUso(stream(partes), aoTerminar)).text();
    expect(saida).toBe(partes.join(""));
    expect(aoTerminar.mock.calls[0][0]).toEqual({ prompt_tokens: 90000, completion_tokens: 800, cost: 0.0081 });
  });

  it("entrega null quando não veio usage", async () => {
    const aoTerminar = vi.fn();
    await new Response(comRegistroDeUso(stream(["data: [DONE]\n\n"]), aoTerminar)).text();
    expect(aoTerminar.mock.calls[0][0]).toBeNull();
  });

  it("junta o texto dos deltas e o último finish_reason", async () => {
    const partes = [
      'data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" amiga"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
    ];
    const aoTerminar = vi.fn();
    expect(await new Response(comRegistroDeUso(stream(partes), aoTerminar)).text()).toBe(partes.join(""));
    expect(aoTerminar.mock.calls[0][1]).toEqual({ texto: "Oi amiga", finishReason: "stop" });
  });
});
