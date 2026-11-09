"use client";

import Link from "next/link";
import { ArrowRight, Check, Clapperboard, Flame } from "lucide-react";
import { ChapterCover } from "@/components/chapter-cover";
import { DotsStrip, Squiggle } from "@/components/doodles";
import { useChapterProgress } from "@/hooks/use-progress";
import { chapters, chapterPath, totalReadingMinutes } from "@/content/chapters";
import { cn } from "@/lib/utils";

const Chapters = () => {
  const { completed } = useChapterProgress();
  const percent = Math.round((completed.size / chapters.length) * 100);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Guia completo</p>
          <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-5xl">
            Trilha <span className="accent-word text-gradient pr-1">do zero</span>
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Leia na ordem. Cada capítulo termina em algo prático para fazer hoje —
            {" "}
            <span className="marker">{totalReadingMinutes} minutos</span> no total.
          </p>
          <Squiggle className="mt-3 text-rose/45" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <DotsStrip className="text-rose/50" />
          <span className="sticker -rotate-1">
            <Flame className="h-3 w-3 text-rose" />
            {completed.size} de {chapters.length} concluídos
          </span>
        </div>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-rose transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>

      <Link
        href="/app/campeoes"
        className="hover-lift flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/70 p-5 hover:border-rose/40"
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-soft text-rose">
            <Clapperboard className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-display text-lg leading-none">Vídeos campeões</span>
            <span className="mt-1.5 block text-[13px] text-muted-foreground">
              os vídeos que mais venderam, para modelar o seu
            </span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      <ol className="grid gap-4 sm:grid-cols-2">
        {chapters.map((chapter, index) => {
          const done = completed.has(chapter.slug);
          return (
            <li key={chapter.slug} style={{ animationDelay: `${index * 40}ms` }} className="animate-rise">
              <Link
                href={chapterPath(chapter.slug)}
                className={cn(
                  "hover-lift group flex h-full flex-col rounded-2xl border bg-card/70 p-4 hover:border-rose/40",
                  done ? "border-rose/40" : "border-border",
                )}
              >
                <ChapterCover numero={chapter.number} className="mb-4" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {chapter.readingMinutes} min de leitura
                  </span>
                  {done ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-display text-[19px] leading-snug transition-colors group-hover:text-rose">
                  {chapter.title}
                </p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
                  {chapter.subtitle}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-foreground/60 transition-colors group-hover:text-rose">
                  {done ? "reler capítulo" : "abrir capítulo"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default Chapters;
