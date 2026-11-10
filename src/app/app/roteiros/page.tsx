"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Sparkles, Wand2 } from "lucide-react";
import { ScriptGenerator } from "@/components/script-generator";
import { HookBank } from "@/components/hook-bank";
import { ehFormato } from "@/content/formatos";
import { useGanchos } from "@/hooks/use-ganchos";
import { cn } from "@/lib/utils";

type View = "gerador" | "ganchos";

const Scripts = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: ganchos } = useGanchos();

  // O Studio manda o produto pela URL (?produto=…&formato=…&gerar=1).
  const produto = (searchParams.get("produto") ?? "").slice(0, 120);
  const formatoParam = searchParams.get("formato");
  const formato = ehFormato(formatoParam) ? formatoParam : undefined;
  const gerar = searchParams.get("gerar") === "1" && produto.trim().length >= 2;
  // tira o ?gerar da URL para não gerar de novo ao recarregar
  const limparUrl = useCallback(() => router.replace("/app/roteiros?aba=gerador", { scroll: false }), [router]);

  // Os ganchos vêm primeiro. A aba fica na URL: o "Novo roteiro" do menu (?aba=gerador) troca de aba
  // mesmo com a página já aberta.
  const view: View = searchParams.get("aba") === "gerador" || produto ? "gerador" : "ganchos";
  const setView = (v: View) => router.replace(v === "gerador" ? "/app/roteiros?aba=gerador" : "/app/roteiros", { scroll: false });

  const views = [
    { id: "ganchos" as View, label: "Ganchos", icon: Flame, hint: ganchos ? `${ganchos.length} pra testar` : "Banco + comunidade" },
    { id: "gerador" as View, label: "Criar roteiro", icon: Wand2, hint: "Roteiro + 5×5" },
  ];

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">
          <Sparkles className="h-3 w-3" /> Estúdio de roteiros
        </p>
        {view === "ganchos" ? (
          <>
            <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-[52px]">
              Comece pelo gancho,{" "}
              <span className="accent-word text-gradient pr-1">o resto vem.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Os primeiros 3 segundos decidem se a pessoa fica. Pegue um gancho do banco, veja os que as alunas
              mais bem avaliaram e compartilhe os que funcionaram pra você.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-[52px]">
              Seu próximo vídeo,{" "}
              <span className="accent-word text-gradient pr-1">já roteirizado.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              Escreva o produto, escolha o formato e receba o roteiro pronto para gravar, com mais 5 ganchos, 5
              problemas, 5 soluções e 5 CTAs para testar.
            </p>
          </>
        )}
      </header>

      <div role="tablist" aria-label="Ferramentas" className="inline-flex w-full gap-1 rounded-full border border-border bg-card p-1 shadow-soft sm:w-auto">
        {views.map((item) => {
          const Icon = item.icon;
          const ativo = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setView(item.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold transition-all sm:flex-none sm:px-5",
                ativo && item.id === "ganchos" && "bg-gradient-pop text-primary-foreground shadow-glow",
                ativo && item.id === "gerador" && "bg-foreground text-background shadow-soft",
                !ativo && "text-foreground/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              <span className={cn("hidden text-[11px] font-medium sm:inline", ativo ? "opacity-70" : "text-muted-foreground")}>
                {item.hint}
              </span>
            </button>
          );
        })}
      </div>

      {view === "ganchos" ? (
        <HookBank />
      ) : (
        <ScriptGenerator
          inicial={{ produto, formato, publico: (searchParams.get("publico") ?? "").slice(0, 120) }}
          gerarAoAbrir={gerar}
          onGerou={limparUrl}
        />
      )}
    </div>
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <Scripts />
  </Suspense>
);

export default Page;
