"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Flame, PlayCircle, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterBlocks } from "@/components/chapter-blocks";
import { ChapterCover } from "@/components/chapter-cover";
import { PerguntarSelecao } from "@/components/perguntar-selecao";
import { StarBurst } from "@/components/doodles";
import { VideoEmbed } from "@/components/video-embed";
import { useChapterVideos } from "@/hooks/use-videos";
import { useChapterProgress, useChecklistProgress } from "@/hooks/use-progress";
import { getAdjacentChapters, getChapter } from "@/content/chapters";
import { cn } from "@/lib/utils";

const ChapterReader = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const router = useRouter();
  const chapter = getChapter(slug);
  const { isCompleted, setChapterCompleted } = useChapterProgress();
  const { done: checkedKeys, toggle } = useChecklistProgress();
  const { data: videos = [] } = useChapterVideos(chapter?.slug);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(height > 0 ? Math.min(100, (window.scrollY / height) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!chapter) router.replace("/app/capitulos");
  }, [chapter, router]);

  if (!chapter) return null;

  const { previous, next } = getAdjacentChapters(chapter.slug);
  const done = isCompleted(chapter.slug);

  return (
    <div className="space-y-8">
      <div className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent">
        <div
          className="h-full bg-rose transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/app/capitulos"
          className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Todos os capítulos
        </Link>
        <Button
          variant={done ? "secondary" : "outline"}
          size="sm"
          onClick={() => setChapterCompleted(chapter.slug, !done)}
        >
          <Check className="h-3.5 w-3.5" />
          {done ? "Concluído" : "Marcar como lido"}
        </Button>
      </div>

      <article>
        <header className="space-y-5 border-b border-border pb-8">
          <ChapterCover numero={chapter.number} variante="banner" className="h-32 sm:h-40" />
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-rose">
              <StarBurst className="h-4 w-4 text-rose/70" />
              Capítulo {String(chapter.number).padStart(2, "0")}
            </p>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {chapter.readingMinutes} min
            </span>
          </div>
          <div>
            <h1 className="font-display text-[38px] leading-[1.02] tracking-[-0.025em] sm:text-[52px]">
              {chapter.title}
            </h1>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
              {chapter.subtitle}
            </p>
          </div>
        </header>

        {videos.length ? (
          <section className="mt-9 space-y-5">
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose">
              <PlayCircle className="h-3.5 w-3.5" />
              Aulas e exemplos em vídeo
            </p>
            {videos.map((video) => (
              <article
                key={video.id}
                className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5"
              >
                <VideoEmbed url={video.url} titulo={video.titulo} />
                <p className="mt-3 font-display text-[19px] leading-snug">{video.titulo}</p>
                {video.descricao ? (
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {video.descricao}
                  </p>
                ) : null}
              </article>
            ))}
          </section>
        ) : null}

        <PerguntarSelecao slug={chapter.slug}>
          <div className="mt-9">
            <ChapterBlocks
              blocks={chapter.blocks}
              scope={chapter.slug}
              interactive
              done={checkedKeys}
              onToggle={toggle}
            />
          </div>
        </PerguntarSelecao>

        {chapter.slug === "seu-plano-para-comecar" ? (
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link
              href="/app/checklist?aba=desafio"
              className="group rounded-2xl border border-border bg-card/70 p-5 transition-colors hover:border-rose/40"
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose">
                <Flame className="h-3 w-3" />
                Desafio 7 dias
              </span>
              <p className="mt-2 font-display text-lg leading-snug group-hover:text-rose">
                Um vídeo por dia, marcando o Shop Studio
              </p>
            </Link>
            <Link
              href="/app/resultados"
              className="group rounded-2xl border border-border bg-card/70 p-5 transition-colors hover:border-rose/40"
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Trophy className="h-3 w-3" />
                Resultados
              </span>
              <p className="mt-2 font-display text-lg leading-snug group-hover:text-rose">
                Veja o que outras alunas já fizeram
              </p>
            </Link>
          </div>
        ) : null}

        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg leading-none">
              Perguntou algo e ficou na dúvida?
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              O assistente responde com base neste capítulo.
            </p>
          </div>
          <Button asChild variant="rose" size="sm">
            <Link href={`/app/assistente?capitulo=${chapter.slug}`}>
              <Sparkles className="h-3.5 w-3.5" />
              Perguntar à IA
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex justify-center">
          <Button
            variant={done ? "secondary" : "default"}
            onClick={() => setChapterCompleted(chapter.slug, !done)}
          >
            <Check className="h-4 w-4" />
            {done ? "Você já concluiu este capítulo" : "Concluir capítulo"}
          </Button>
        </div>
      </article>

      <nav className="grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
        {previous ? (
          <Link
            href={`/app/capitulos/${previous.slug}`}
            className={cn(
              "group rounded-2xl border border-border p-5 transition-colors hover:border-rose/40 hover:bg-secondary/40",
            )}
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <ArrowLeft className="h-3 w-3" />
              Anterior
            </span>
            <p className="mt-2 font-display text-lg leading-snug group-hover:text-rose">
              {previous.title}
            </p>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? (
          <Link
            href={`/app/capitulos/${next.slug}`}
            className="group rounded-2xl border border-border p-5 text-right transition-colors hover:border-rose/40 hover:bg-secondary/40"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Próximo
              <ArrowRight className="h-3 w-3" />
            </span>
            <p className="mt-2 font-display text-lg leading-snug group-hover:text-rose">{next.title}</p>
          </Link>
        ) : null}
      </nav>
    </div>
  );
};

export default ChapterReader;
