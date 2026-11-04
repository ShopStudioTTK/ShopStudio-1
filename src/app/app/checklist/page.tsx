"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ListChecks, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Challenge } from "@/components/challenge";
import { useChecklistProgress } from "@/hooks/use-progress";
import { weekOneChecklist } from "@/content/week-one-checklist";
import { chapterPath } from "@/content/chapters";
import { cn } from "@/lib/utils";

type Aba = "semana" | "desafio";

const Checklist = () => {
  const searchParams = useSearchParams();
  const [aba, setAba] = useState<Aba>(searchParams.get("aba") === "desafio" ? "desafio" : "semana");
  const { isDone, toggle } = useChecklistProgress();
  const total = weekOneChecklist.length;
  const completed = weekOneChecklist.filter((item) => isDone(item.key)).length;
  const percent = Math.round((completed / total) * 100);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Sua semana</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
          Checklists
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          A semana 1 do guia e o desafio de 7 dias. Marque conforme faz — o progresso fica salvo na
          sua conta.
        </p>
      </header>

      <div className="grid gap-2 rounded-2xl border border-border bg-secondary/40 p-1.5 sm:grid-cols-2">
        {(
          [
            { id: "semana" as Aba, label: "Semana 1", hint: `${total} itens`, icon: ListChecks },
            { id: "desafio" as Aba, label: "Desafio 7 dias", hint: "1 vídeo por dia", icon: Flame },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setAba(item.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                aba === item.id
                  ? "bg-card text-foreground shadow-soft"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4" />
                <span className="text-[14px] font-medium">{item.label}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">{item.hint}</span>
            </button>
          );
        })}
      </div>

      {aba === "desafio" ? (
        <Challenge />
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-3xl leading-none">
                {completed}
                <span className="ml-1 text-base text-muted-foreground">/ {total}</span>
              </p>
              <span className="text-[12px] text-muted-foreground">{percent}% concluído</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-rose transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            {completed === total ? (
              <p className="mt-4 rounded-xl bg-rose-soft/60 px-3.5 py-2.5 text-[13px] text-foreground">
                Semana 1 fechada. Agora é repetir: gravar em lote, publicar todo dia e estudar o top
                5.
              </p>
            ) : null}
          </div>

          <ul className="divide-y divide-border border-y border-border">
            {weekOneChecklist.map((item) => {
              const checked = isDone(item.key);
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => toggle(item.key, !checked)}
                    aria-pressed={checked}
                    className="flex w-full items-start gap-3 py-4 text-left transition-colors hover:bg-secondary/40"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                        checked ? "border-rose bg-rose" : "border-foreground/25",
                      )}
                    >
                      {checked ? (
                        <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3.5} />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-[15px] leading-relaxed transition-colors",
                        checked ? "text-muted-foreground line-through" : "text-foreground/85",
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-soft text-rose">
                <ListChecks className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-lg leading-none">Ainda falta inspiração?</p>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  Revise a rotina do dia de gravação no capítulo 12.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={chapterPath("seu-plano-para-comecar")}>
                Abrir capítulo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const ChecklistPage = () => (
  <Suspense fallback={null}>
    <Checklist />
  </Suspense>
);

export default ChecklistPage;
