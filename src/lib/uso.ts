import { lerEventos } from "@/lib/sse";

export type Uso = {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens?: number };
};

/** Repassa o SSE da OpenRouter sem alterar e, ao fim, entrega o `usage` (tokens e custo) do stream. */
export const comRegistroDeUso = (
  corpo: ReadableStream<Uint8Array>,
  aoTerminar: (uso: Uso | null) => Promise<void> | void,
): ReadableStream<Uint8Array> => {
  const decoder = new TextDecoder();
  let buffer = "";
  let uso: Uso | null = null;
  const examinar = (texto: string) => {
    const { dados, resto } = lerEventos(texto);
    buffer = resto;
    for (const dado of dados) {
      try {
        const evento = JSON.parse(dado);
        if (evento?.usage) uso = evento.usage;
      } catch {
        // [DONE] e afins
      }
    }
  };
  return corpo.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        examinar(buffer + decoder.decode(chunk, { stream: true }));
      },
      async flush() {
        examinar(buffer + decoder.decode() + "\n\n");
        await aoTerminar(uso);
      },
    }),
  );
};
