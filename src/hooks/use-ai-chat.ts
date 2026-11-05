"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { PERGUNTAS_HOJE_KEY } from "@/hooks/use-perguntas-hoje";
import { lerEventos } from "@/lib/sse";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

const FALHA = "Não consegui responder agora. Tente de novo.";

export const useAiChat = (capitulo?: string) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const patchLast = (patch: (message: ChatMessage) => ChatMessage) =>
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === "assistant" ? [...prev.slice(0, -1), patch(last)] : prev;
    });

  // Tira a bolha vazia de "Pensando" se nada chegou; senão só para o cursor.
  const finishLast = () =>
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role !== "assistant") return prev;
      return last.content ? [...prev.slice(0, -1), { ...last, isStreaming: false }] : prev.slice(0, -1);
    });

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;
      if (!session?.access_token) {
        setError("Entre na sua conta para usar o assistente.");
        return;
      }

      const history = [...messages, { id: crypto.randomUUID(), role: "user" as const, content: trimmed }];
      setMessages([...history, { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true }]);
      setIsLoading(true);
      setError(null);
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/assistente", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            messages: history.map(({ role, content: text }) => ({ role, content: text })),
            capitulo,
          }),
          signal: abortRef.current.signal,
        });
        if (!res.ok || !res.body) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error?.message || FALHA);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const { dados, resto } = lerEventos(buffer + decoder.decode(value, { stream: true }));
          buffer = resto;
          for (const dado of dados) {
            if (dado === "[DONE]") continue;
            let evento: { error?: { message?: string }; choices?: { delta?: { content?: string } }[] };
            try {
              evento = JSON.parse(dado);
            } catch {
              continue;
            }
            if (evento.error) throw new Error(evento.error.message || FALHA);
            const delta = evento.choices?.[0]?.delta?.content;
            if (delta) patchLast((m) => ({ ...m, content: m.content + delta }));
          }
        }
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          setError(err instanceof Error && err.message ? err.message : FALHA);
        }
      } finally {
        finishLast();
        setIsLoading(false);
        void queryClient.invalidateQueries({ queryKey: [PERGUNTAS_HOJE_KEY] });
      }
    },
    [capitulo, isLoading, messages, session?.access_token, queryClient],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, sendMessage, reset };
};
