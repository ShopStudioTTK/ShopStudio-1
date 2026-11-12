import { lerEventos } from "@/lib/sse";

export type Uso = {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  prompt_tokens_details?: { cached_tokens?: number };
};

export type FimDoStream = { texto: string; finishReason: string | null };

/**
 * Repassa o SSE da OpenRouter sem alterar e, ao fim, entrega o `usage` (tokens e custo) do stream,
 * o texto gerado e o último `finish_reason`. Lê a OpenRouter até o fim mesmo se a aluna sair da
 * página (F5, outra tela): `terminou` só resolve depois de `aoTerminar`, e a rota o passa ao `after()`.
 * Se a conexão de cima cair, o stream da aluna fecha e `aoTerminar` recebe o que veio.
 */
export const comRegistroDeUso = (
  origem: ReadableStream<Uint8Array>,
  aoTerminar: (uso: Uso | null, fim: FimDoStream) => Promise<void> | void,
): { corpo: ReadableStream<Uint8Array>; terminou: Promise<void> } => {
  const decoder = new TextDecoder();
  let buffer = "";
  let uso: Uso | null = null;
  const fim: FimDoStream = { texto: "", finishReason: null };
  const examinar = (texto: string) => {
    const { dados, resto } = lerEventos(texto);
    buffer = resto;
    for (const dado of dados) {
      try {
        const evento = JSON.parse(dado);
        if (evento?.usage) uso = evento.usage;
        const escolha = evento?.choices?.[0];
        if (typeof escolha?.delta?.content === "string") fim.texto += escolha.delta.content;
        if (escolha?.finish_reason) fim.finishReason = escolha.finish_reason;
      } catch {
        // [DONE] e afins
      }
    }
  };

  // null = a aluna saiu: o resto da resposta não tem para onde ir, mas continua sendo lido.
  let aluna: ReadableStreamDefaultController<Uint8Array> | null = null;
  const corpo = new ReadableStream<Uint8Array>({
    start: (c) => void (aluna = c),
    cancel: () => void (aluna = null),
  });
  const repassar = (fazer: (c: ReadableStreamDefaultController<Uint8Array>) => void) => {
    try {
      if (aluna) fazer(aluna);
    } catch {
      aluna = null;
    }
  };

  const terminou = (async () => {
    // ponytail: sem backpressure, o que a aluna não leu fica na memória; é uma resposta de chat.
    const leitor = origem.getReader();
    try {
      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        repassar((c) => c.enqueue(value));
        examinar(buffer + decoder.decode(value, { stream: true }));
      }
      examinar(buffer + decoder.decode() + "\n\n");
    } catch (e) {
      console.error("stream da OpenRouter caiu no meio", e);
    }
    repassar((c) => c.close());
    await aoTerminar(uso, fim);
  })();
  return { corpo, terminou };
};
