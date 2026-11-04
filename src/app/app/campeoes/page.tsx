"use client";

import Link from "next/link";
import { Clapperboard, Trophy } from "lucide-react";
import { VideoEmbed } from "@/components/video-embed";
import { useChampionVideos } from "@/hooks/use-videos";
import { chapterPath } from "@/content/chapters";

const Champioes = () => {
  const { data: videos = [], isLoading } = useChampionVideos();

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Inspiração</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
          Vídeos campeões
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Os vídeos que mais venderam, com o gancho, o produto e o formato que funcionaram. Assista,
          anote o que dá certo e adapte para o seu produto — modelar não é copiar.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="aspect-video animate-pulse rounded-2xl border border-border bg-secondary/40" />
          ))}
        </div>
      ) : videos.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article key={video.id} className="space-y-3">
              <VideoEmbed url={video.url} titulo={video.titulo} />
              <div>
                <p className="font-display text-[19px] leading-snug">{video.titulo}</p>
                {video.descricao ? (
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">
                    {video.descricao}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
            <Trophy className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-2xl leading-snug">
            A galeria ainda está vazia.
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
            Os vídeos campeões são cadastrados pela administração. Enquanto isso, estude a estrutura
            do capítulo 10 e use o Banco de ganchos para montar o seu.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={chapterPath("a-estrutura-dos-videos-que-vendem")}
              className="sticker hover:border-rose/50"
            >
              <Clapperboard className="h-3 w-3 text-rose" />
              abrir capítulo 10
            </Link>
            <Link href="/app/roteiros" className="sticker hover:border-rose/50">
              banco de ganchos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Champioes;
