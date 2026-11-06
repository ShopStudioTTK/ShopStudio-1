"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAiChat } from "@/hooks/use-ai-chat";
import { useAuth } from "@/hooks/use-auth";
import { usePerguntasHoje } from "@/hooks/use-perguntas-hoje";
import { getChapter } from "@/content/chapters";
import { LIMITE_DIARIO, mensagemDeLimite } from "@/lib/limite";
import { cn, partesNegrito } from "@/lib/utils";

const suggestions = [
  "Quantos seguidores preciso para ativar a conta?",
  "Como pedir uma amostra grátis?",
  "Qual comissão vale a pena?",
  "Me dá 3 ideias de vídeo para um produto de skincare",
];

const Assistant = () => {
  const searchParams = useSearchParams();
  const chapterSlug = searchParams.get("capitulo") ?? "";
  const chapter = chapterSlug ? getChapter(chapterSlug) : undefined;
  const trecho = (searchParams.get("trecho") ?? "").trim().slice(0, 500);
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const { messages, isLoading, error, sendMessage, reset } = useAiChat(chapter?.slug);
  const { data: usadas = 0, isSuccess: contagemPronta } = usePerguntasHoje();
  const esgotado = usadas >= LIMITE_DIARIO;
  const aviso = mensagemDeLimite(usadas);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const trechoEnviado = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Trecho selecionado no capítulo: vira a primeira pergunta, uma vez só.
  useEffect(() => {
    if (!trecho || trechoEnviado.current || !session || !contagemPronta) return;
    trechoEnviado.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("trecho");
    router.replace(params.size ? `${pathname}?${params}` : pathname);
    if (esgotado) return;
    void sendMessage(
      `Me explica melhor este trecho${chapter ? ` do capítulo "${chapter.title}"` : ""}: "${trecho}"`,
    );
  }, [trecho, session, contagemPronta, esgotado, chapter, pathname, router, searchParams, sendMessage]);

  const handleSend = (value?: string) => {
    const text = (value ?? input).trim();
    if (!text || esgotado) return;
    void sendMessage(text);
    setInput("");
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-6">
        <div>
          <p className="eyebrow">Assistente</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em]">
            Pergunte como para uma amiga
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Respostas baseadas nos 12 capítulos e nas aulas do Shop Studio. Sem promessa de ganhos, sem
            enrolação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={reset} disabled={messages.length === 0}>
            <RotateCcw className="h-3.5 w-3.5" />
            Nova conversa
          </Button>
        </div>
      </header>

      {chapter ? (
        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[12px] text-foreground/70">
          <Sparkles className="h-3 w-3 text-rose" />
          Contexto: Capítulo {String(chapter.number).padStart(2, "0")} · {chapter.title}
        </div>
      ) : null}

      <div className="flex-1 space-y-5 py-6">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-soft text-rose">
              <Sparkles className="h-4 w-4" />
            </span>
            <p className="mt-4 font-display text-2xl leading-snug">
              Oi! Pode perguntar do jeito que você perguntaria para uma amiga.
            </p>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">
              Requisitos da conta, comissão, amostra, link no vídeo, ideia de gancho. Se a resposta
              estiver no guia ou nas aulas, eu respondo. Se não estiver, eu falo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSend(suggestion)}
                  disabled={esgotado}
                  className="rounded-full border border-border bg-background px-3.5 py-1.5 text-left text-[12.5px] text-foreground/75 transition-colors hover:border-rose/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {message.role === "assistant" ? (
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-soft text-rose">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed",
                  message.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card text-foreground/90",
                )}
              >
                {message.content ? (
                  <div className="whitespace-pre-wrap">
                    {partesNegrito(message.content).map((parte, i) =>
                      i % 2 ? <strong key={i} className="font-semibold text-foreground">{parte}</strong> : parte,
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Pensando
                  </span>
                )}
                {message.isStreaming && message.content ? (
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-rose align-middle" />
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-1 border-t border-border bg-background/95 px-1 pb-2 pt-4 backdrop-blur">
        {aviso ? (
          <p className="mb-2 text-center text-[12px] text-rose" role="status">
            {aviso}
          </p>
        ) : null}
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft focus-within:border-rose/50">
          <Textarea
            disabled={esgotado}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escreva sua dúvida sobre o TikTok Shop..."
            rows={1}
            className="min-h-[44px] resize-none border-0 bg-transparent text-[14.5px] shadow-none focus-visible:ring-0"
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={isLoading || esgotado || !input.trim()}
            aria-label="Enviar"
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          O assistente usa o guia como base. Regras da plataforma podem mudar — confirme no app.
        </p>
      </div>
    </div>
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <Assistant />
  </Suspense>
);

export default Page;
