"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CREDITOS_KEY } from "@/hooks/use-creditos";
import { esperarPedido, esquecer, lembrado, lembrar } from "@/lib/pedido";
import { lerEventos } from "@/lib/sse";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

const FALHA = "Não consegui responder agora. Tente de novo.";
const FALHA_DA_IA =
  "A assistente não conseguiu responder agora (o servidor da IA ficou instável). Toque em “Tentar de novo” para reenviar sua última mensagem.";

/** Conversa guardada para o F5: as mensagens, o id dela e o pedido que a IA ainda estava respondendo. */
type Guardada = { conversa: string | null; messages: ChatMessage[]; pedido: string | null };

/** Erro que não adianta repetir (sem login, sem acesso, sem créditos): a tela não oferece "Tentar de novo". */
class SemRepetir extends Error {}

export const useAiChat = (capitulo?: string) => {
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  // Depois do F5, a conversa volta (o AppShell só monta no navegador, então o sessionStorage existe).
  const [guardada] = useState(() => lembrado<Guardada>("assistente", user?.id));
  const [messages, setMessages] = useState<ChatMessage[]>(guardada?.messages ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pergunta que a IA não respondeu (provedor caiu, 504/499, resposta vazia ou cortada): o botão a reenvia.
  const [semResposta, setSemResposta] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Uma conversa = um item na fila de treinamento da expert. Novo id a cada "Nova conversa".
  const conversaRef = useRef<string | null>(guardada?.conversa ?? null);
  // Pedido que a IA está respondendo: com ele, o F5 retoma a resposta (GET /api/pedidos).
  const pedidoRef = useRef<string | null>(null);
  const retomou = useRef(false);
  // Muda a cada "Nova conversa": a resposta retomada que chega depois disso é de outra conversa e é ignorada.
  const vez = useRef(0);

  // Guarda a conversa a cada mudança (sem a bolha que ainda está chegando).
  useEffect(() => {
    if (!user?.id) return;
    lembrar("assistente", user.id, {
      conversa: conversaRef.current,
      messages: messages.filter((m) => !m.isStreaming),
      pedido: pedidoRef.current,
    } satisfies Guardada);
  }, [messages, user?.id]);
  // Saiu da página pelo app (link, voltar, depois de confirmar): a conversa vai embora, como antes.
  // O F5 não desmonta, então ela fica para a volta.
  useEffect(() => () => esquecer("assistente"), []);

  const patchLast = (patch: (message: ChatMessage) => ChatMessage) =>
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === "assistant" ? [...prev.slice(0, -1), patch(last)] : prev;
    });

  // Resposta completa: só para o cursor. Senão tira a bolha (vazia ou pela metade); a pergunta fica.
  const finishLast = (completa: boolean) =>
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role !== "assistant") return prev;
      return completa ? [...prev.slice(0, -1), { ...last, isStreaming: false }] : prev.slice(0, -1);
    });

  const enviar = useCallback(
    async (pergunta: string, anteriores: ChatMessage[]) => {
      if (!pergunta || isLoading) return;
      if (!session?.access_token) {
        setError("Entre na sua conta para usar o assistente.");
        return;
      }

      const history = [...anteriores, { id: crypto.randomUUID(), role: "user" as const, content: pergunta }];
      setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true }]);
      setIsLoading(true);
      setError(null);
      setSemResposta(null);
      abortRef.current = new AbortController();
      pedidoRef.current = crypto.randomUUID();
      let completa = false;
      // Conexão cortada (TypeError do fetch; o próprio F5 corta): o servidor segue com o pedido,
      // então ele fica guardado para o F5 retomar.
      let semConexao = false;

      try {
        const res = await fetch("/api/assistente", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            messages: history.map(({ role, content: text }) => ({ role, content: text })),
            capitulo,
            conversa: (conversaRef.current ??= crypto.randomUUID()),
            pedido: pedidoRef.current,
          }),
          signal: abortRef.current.signal,
        });
        if (!res.ok || !res.body) {
          const json = await res.json().catch(() => null);
          if (res.status < 500) throw new SemRepetir(json?.error?.message || FALHA);
          throw new Error(FALHA_DA_IA);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let texto = "";
        let finishReason: string | null = null;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const { dados, resto } = lerEventos(buffer + decoder.decode(value, { stream: true }));
          buffer = resto;
          for (const dado of dados) {
            if (dado === "[DONE]") continue;
            let evento: {
              error?: unknown;
              choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
            };
            try {
              evento = JSON.parse(dado);
            } catch {
              continue;
            }
            // erro do provedor no meio do stream (a OpenRouter manda o erro como evento)
            if (evento.error) throw new Error(FALHA_DA_IA);
            const escolha = evento.choices?.[0];
            if (escolha?.finish_reason) finishReason = escolha.finish_reason;
            const delta = escolha?.delta?.content;
            if (delta) {
              texto += delta;
              patchLast((m) => ({ ...m, content: m.content + delta }));
            }
          }
        }
        // Stream que acabou sem "stop" (caiu, foi cortado) ou sem texto: a IA não respondeu.
        if (!texto.trim() || finishReason !== "stop") throw new Error(FALHA_DA_IA);
        completa = true;
      } catch (err) {
        semConexao = err instanceof TypeError;
        if (err instanceof SemRepetir) setError(err.message);
        else if (!(err instanceof Error && err.name === "AbortError")) {
          setError(FALHA_DA_IA);
          setSemResposta(pergunta);
        }
      } finally {
        if (!semConexao) pedidoRef.current = null;
        finishLast(completa);
        setIsLoading(false);
        void queryClient.invalidateQueries({ queryKey: [CREDITOS_KEY] });
      }
    },
    [capitulo, isLoading, session?.access_token, queryClient],
  );

  // F5 no meio da resposta: o servidor terminou sozinho e guardou. Mostra "Pensando" até ela chegar,
  // inteira de uma vez. Falhou (IA caiu, não chegou, passou do tempo): o aviso com "Tentar de novo".
  useEffect(() => {
    const pedido = guardada?.pedido;
    const ultima = guardada?.messages.at(-1);
    if (!pedido || retomou.current || ultima?.role !== "user") return;
    retomou.current = true;
    const minha = vez.current;
    pedidoRef.current = pedido;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true }]);
    setIsLoading(true);
    let completa = false;
    esperarPedido<{ texto: string }>(pedido)
      .then(({ texto }) => {
        if (vez.current !== minha) return;
        patchLast((m) => ({ ...m, content: texto }));
        completa = true;
      })
      .catch(() => {
        if (vez.current !== minha) return;
        setError(FALHA_DA_IA);
        setSemResposta(ultima.content);
      })
      .finally(() => {
        if (vez.current !== minha) return;
        pedidoRef.current = null;
        finishLast(completa);
        setIsLoading(false);
        void queryClient.invalidateQueries({ queryKey: [CREDITOS_KEY] });
      });
  }, [guardada, queryClient]);

  const sendMessage = useCallback((content: string) => enviar(content.trim(), messages), [enviar, messages]);

  /** Reenvia a pergunta que ficou sem resposta, sem repetir a bolha dela. */
  const tentarDeNovo = useCallback(() => {
    const ultima = messages[messages.length - 1];
    if (!semResposta || ultima?.role !== "user" || ultima.content !== semResposta) return;
    void enviar(semResposta, messages.slice(0, -1));
  }, [enviar, messages, semResposta]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    vez.current++;
    conversaRef.current = null;
    pedidoRef.current = null;
    setMessages([]);
    setError(null);
    setSemResposta(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, podeTentarDeNovo: !!semResposta, tentarDeNovo, sendMessage, reset };
};
