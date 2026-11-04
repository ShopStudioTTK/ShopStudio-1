"use client";

import { primeiroNome } from "@/lib/nome";
import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  ArrowUpRight,
  BookOpen,
  Check,
  Flame,
  ListChecks,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterCover } from "@/components/chapter-cover";
import { VideoEmbed } from "@/components/video-embed";
import { Marquee } from "@/components/marquee";
import { ArrowCurve, PhoneMock, Squiggle } from "@/components/doodles";
import { useAuth } from "@/hooks/use-auth";
import { useChapterProgress, useChecklistProgress } from "@/hooks/use-progress";
import { useChampionVideos } from "@/hooks/use-videos";
import { chapters, chapterPath } from "@/content/chapters";
import { weekOneChecklist } from "@/content/week-one-checklist";
import { desafioDias } from "@/content/challenge";

const shortcuts = [
  { to: "/app/assistente", icon: Sparkles, title: "Assistente", text: "Tire uma dúvida agora" },
  { to: "/app/roteiros", icon: Wand2, title: "Roteiros", text: "Ganchos e CTAs prontos" },
  { to: "/app/checklist", icon: ListChecks, title: "Checklist", text: "Semana 1, item por item" },
  { to: "/app/resultados", icon: Trophy, title: "Resultados", text: "Mural das alunas" },
  { to: "/app/campeoes", icon: Clapperboard, title: "Campeões", text: "Os vídeos que vendem" },
];

const ProgressRing = ({ percent }: { percent: number }) => (
  <div className="relative h-20 w-20 shrink-0">
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--cream) / 0.16)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="hsl(var(--rose))"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * 264} 264`}
        className="transition-all duration-700"
      />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center font-display text-lg">
      {percent}%
    </span>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { completed } = useChapterProgress();
  const { isDone, toggle } = useChecklistProgress();
  const { data: campeoes = [] } = useChampionVideos();

  const firstName = primeiroNome(user?.user_metadata, user?.email) || "Shop Girl";

  const nextChapter =
    chapters.find((chapter) => !completed.has(chapter.slug)) ?? chapters[chapters.length - 1];
  const percent = Math.round((completed.size / chapters.length) * 100);
  const diasPostados = desafioDias.filter((dia) => isDone(`desafio-${dia.dia}`)).length;

  return (
    <div className="space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Seu painel</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            Oi, {firstName}.{" "}
            <span className="whitespace-nowrap" aria-hidden="true">✨🎀</span>
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            {completed.size === 0
              ? "Comece pelo capítulo 1 e siga na ordem: cada um prepara o próximo."
              : `Você já concluiu ${completed.size} de ${chapters.length} capítulos. Continue de onde parou.`}
          </p>
          <Squiggle className="mt-3 text-rose/50" />
        </div>
        <div className="flex items-end gap-2">
          <ArrowCurve className="hidden -scale-x-100 text-rose/50 sm:block" />
          <span className="sticker -rotate-2">
            <Flame className="h-3 w-3 text-rose" />
            {diasPostados > 0 ? `${diasPostados}/7 dias de desafio` : "semana 1 começa hoje"}
          </span>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <article className="paper relative overflow-hidden rounded-[28px] border border-border p-6 shadow-soft sm:p-7">
          <div className="flex items-start gap-4 sm:gap-7">
            <ChapterCover numero={nextChapter.number} className="w-24 shrink-0 sm:w-36" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose">
                {completed.size === 0 ? "Comece aqui" : "Continuar lendo"}
              </p>
              <h2 className="mt-2 font-display text-[26px] leading-[1.1] sm:text-[30px]">
                {nextChapter.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                {nextChapter.summary}
              </p>
              <Button asChild className="mt-5">
                <Link href={chapterPath(nextChapter.slug)}>
                  {completed.size === 0 ? "Ler o capítulo" : "Continuar"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </article>

        <article className="hero-surface relative overflow-hidden rounded-[28px] p-6 text-cream">
          <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-45 blur-[80px]"
            style={{ background: "radial-gradient(circle, hsl(var(--rose) / 0.6), transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-5">
            <ProgressRing percent={percent} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-soft">
                Seu progresso
              </p>
              <p className="mt-1 font-display text-3xl leading-none">
                {completed.size}
                <span className="text-cream/50">/{chapters.length}</span>
              </p>
              <p className="mt-1 text-[12px] text-cream/60">capítulos concluídos</p>
            </div>
          </div>
          <div className="relative mt-5 flex items-end justify-between gap-4">
            <Link
              href="/app/capitulos"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-cream/75 transition-colors hover:text-cream"
            >
              Ver o sumário
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <PhoneMock className="hidden w-24 rotate-3 lg:block" />
          </div>
        </article>
      </section>


      {campeoes.length ? (
        <section className="rounded-[28px] border border-border bg-card/70 p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose">
                <Clapperboard className="h-3.5 w-3.5" />
                Vídeos que vendem
              </p>
              <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
                Os vídeos campeões de verdade, que já venderam. Assista e modele o gancho no seu
                produto — modelar não é copiar.
              </p>
            </div>
            <Link
              href="/app/campeoes"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground/65 transition-colors hover:text-foreground"
            >
              Ver os {campeoes.length}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-start">
            <VideoEmbed url={campeoes[0].url} titulo={campeoes[0].titulo} />
            <div>
              <p className="font-display text-[21px] leading-snug">{campeoes[0].titulo}</p>
              {campeoes[0].descricao ? (
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                  {campeoes[0].descricao}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {campeoes.slice(1, 5).map((video) => (
                  <Link
                    key={video.id}
                    href="/app/campeoes"
                    className="max-w-[220px] rounded-xl border border-border bg-background px-3 py-2 text-[12px] leading-snug text-foreground/70 transition-colors hover:border-rose/40 hover:text-foreground"
                  >
                    {video.titulo}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <Marquee />

      <section>
        <p className="eyebrow">Atalhos</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((shortcut, index) => {
            const Icon = shortcut.icon;
            return (
              <Link
                key={shortcut.to}
                href={shortcut.to}
                style={{ animationDelay: `${index * 70}ms` }}
                className="hover-lift animate-rise rounded-2xl border border-border bg-card/70 p-5 hover:border-rose/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-soft text-rose">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-4 font-display text-lg leading-none">{shortcut.title}</p>
                <p className="mt-1.5 text-[12.5px] text-muted-foreground">{shortcut.text}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card/70 p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Semana 1</p>
            <Link href="/app/checklist" className="text-[12px] text-foreground/60 hover:text-foreground">
              Abrir checklist
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {weekOneChecklist.slice(0, 3).map((item) => {
              const checked = isDone(item.key);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => toggle(item.key, !checked)}
                    className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-secondary/50"
                  >
                    <span
                      className={
                        "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors " +
                        (checked ? "border-rose bg-rose" : "border-foreground/25")
                      }
                    >
                      {checked ? (
                        <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span
                      className={
                        "text-[14.5px] leading-snug " +
                        (checked ? "text-muted-foreground line-through" : "text-foreground/80")
                      }
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            href="/app/checklist?aba=desafio"
            className="sticker mt-5 -rotate-1 transition-colors hover:border-rose/50"
          >
            <Flame className="h-3 w-3 text-rose" />
            desafio 7 dias
          </Link>
        </div>

        <div className="hero-surface relative overflow-hidden rounded-2xl p-6 text-cream">
          <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-soft">
            Regra de ouro
          </p>
          <p className="relative mt-3 font-display text-[21px] leading-snug">
            Pessoas não compram produtos, compram <span className="italic">transformação</span>.
          </p>
          <p className="relative mt-3 text-[12.5px] leading-relaxed text-cream/60">
            Capítulo 07 · Nichar ou não nichar
          </p>
          <Link
            href={chapterPath("nichar-ou-nao-nichar")}
            className="relative mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-cream/80 transition-colors hover:text-cream"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Ler capítulo
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
