"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { ScriptGenerator } from "@/components/script-generator";
import { HookBank } from "@/components/hook-bank";
import { ganchos } from "@/content/hooks";
import { cn } from "@/lib/utils";

type View = "gerador" | "ganchos";

const views = [
  { id: "gerador" as View, label: "Gerador 5×5", icon: Wand2, hint: "Cinco de cada" },
  { id: "ganchos" as View, label: "Banco de ganchos", icon: Sparkles, hint: `${ganchos.length} prontos` },
];

const Scripts = () => {
  const [view, setView] = useState<View>("gerador");

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Ferramenta</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
          Roteiros e ganchos
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          O exercício do capítulo 10 em duas partes: o gerador monta o 5×5 do seu produto, e o banco
          de ganchos entrega frases prontas para adaptar.
        </p>
      </header>

      <div className="grid gap-2 rounded-2xl border border-border bg-secondary/40 p-1.5 sm:grid-cols-2">
        {views.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                view === item.id
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

      {view === "gerador" ? <ScriptGenerator /> : <HookBank />}
    </div>
  );
};

export default Scripts;
