"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getChapter } from "@/content/chapters";

const Assistente = () => {
  const searchParams = useSearchParams();
  const chapterSlug = searchParams.get("capitulo") ?? "";
  const chapter = chapterSlug ? getChapter(chapterSlug) : undefined;

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <header className="border-b border-border pb-6">
        <p className="eyebrow">Assistente</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em]">
          Pergunte como para uma amiga
        </h1>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
          Respostas baseadas nos 12 capítulos do guia Shop Studio. Sem promessa de ganhos, sem
          enrolação.
        </p>
      </header>

      {chapter ? (
        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-[12px] text-foreground/70">
          <Sparkles className="h-3 w-3 text-rose" />
          Contexto: Capítulo {String(chapter.number).padStart(2, "0")} · {chapter.title}
        </div>
      ) : null}

      <div className="flex-1 py-6">
        <div className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-soft text-rose">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="mt-4 font-display text-2xl leading-snug">
            O assistente está sendo preparado e chega em breve. Enquanto isso, use o gerador de
            roteiros e os capítulos.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-1 border-t border-border bg-background/95 px-1 pb-2 pt-4 backdrop-blur">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
          <Textarea
            disabled
            placeholder="Escreva sua dúvida sobre o TikTok Shop..."
            rows={1}
            className="min-h-[44px] resize-none border-0 bg-transparent text-[14.5px] shadow-none focus-visible:ring-0"
          />
          <Button size="icon" disabled aria-label="Enviar" className="shrink-0">
            <ArrowUp className="h-4 w-4" />
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
    <Assistente />
  </Suspense>
);

export default Page;
