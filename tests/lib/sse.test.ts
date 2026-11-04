import { describe, expect, it } from "vitest";
import { lerEventos } from "@/lib/sse";

describe("lerEventos", () => {
  it("separa eventos completos, ignora comentários e guarda o pedaço incompleto", () => {
    const { dados, resto } = lerEventos(
      ': OPENROUTER PROCESSING\n\ndata: {"a":1}\n\ndata: [DONE]\n\ndata: {"b"',
    );
    expect(dados).toEqual(['{"a":1}', "[DONE]"]);
    expect(resto).toBe('data: {"b"');
  });

  it("aceita \\r\\n", () => {
    expect(lerEventos('data: {"a":1}\r\n\r\n').dados).toEqual(['{"a":1}']);
  });
});
