"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Trophy } from "lucide-react";
import { CartaoTiktok } from "@/components/video-embed";
import { NICHOS } from "@/content/nichos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { parseVideoUrl } from "@/lib/video";
import { cn } from "@/lib/utils";

type Video = { url: string; titulo: string; outraLingua: boolean };

const Champioes = () => {
  const { user } = useAuth();
  const [aba, setAba] = useState(NICHOS[0].slug);
  const nicho = NICHOS.find((n) => n.slug === aba) ?? NICHOS[0];
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["campeoes", aba],
    enabled: Boolean(user?.id),
    staleTime: 60 * 60 * 1000,
    queryFn: async () => (await api<{ videos: Video[] }>(`/api/campeoes?nicho=${aba}`)).videos,
  });
  const lista = videos.filter((v) => parseVideoUrl(v.url).provider === "tiktok");

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Inspiração</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
          Vídeos campeões
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Os vídeos de produto com mais curtidas e comentários em cada nicho, atualizados todo dia. Assista, anote
          o gancho e o formato que funcionaram e adapte para o seu produto — modelar não é copiar.
        </p>
      </header>

      <div role="tablist" aria-label="Nichos" className="flex flex-wrap gap-2">
        {NICHOS.map((n) => (
          <button
            key={n.slug}
            type="button"
            role="tab"
            aria-selected={n.slug === aba}
            onClick={() => setAba(n.slug)}
            className={cn("sticker transition-colors", n.slug === aba ? "border-rose/60 bg-rose-soft text-rose" : "hover:border-rose/50")}
          >
            {n.rotulo}
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={nicho.rotulo} className="space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="mx-auto aspect-[9/16] w-full max-w-[320px] animate-pulse rounded-2xl border border-border bg-secondary/40" />
            ))}
          </div>
        ) : lista.length ? (
          <>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Achados por um buscador, do mais engajado ao menos. Não são necessariamente os mais recentes, e alguns
              podem estar em outro idioma.
            </p>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((v) => (
                <CartaoTiktok key={v.url} {...v} />
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
              <Trophy className="h-5 w-5" />
            </span>
            <p className="mt-4 font-display text-2xl leading-snug">Não achei vídeos de {nicho.rotulo.toLowerCase()} agora.</p>
            <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
              Tente de novo mais tarde ou veja direto no TikTok.
            </p>
          </div>
        )}
        <a
          href={`https://www.tiktok.com/search?q=${encodeURIComponent(`achadinhos ${nicho.rotulo}`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/80 hover:text-foreground"
        >
          Ver os mais recentes no TikTok
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>
    </div>
  );
};

export default Champioes;
