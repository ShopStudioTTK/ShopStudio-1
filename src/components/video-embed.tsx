import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { parseVideoUrl, providerLabel } from "@/lib/video";
import { cn } from "@/lib/utils";

type VideoEmbedProps = {
  url: string;
  titulo?: string;
  className?: string;
  /** Carrega o player já (sem autoplay), que mostra a capa do vídeo. O iframe é lazy: só carrega perto da tela. */
  previa?: boolean;
};

const comAutoplay = (provider: string, embedUrl: string) =>
  provider === "youtube"
    ? `${embedUrl}&autoplay=1`
    : provider === "vimeo"
      ? `${embedUrl}?autoplay=1`
      : `${embedUrl}&autoplay=1`;

export const VideoEmbed = ({ url, titulo, className, previa = false }: VideoEmbedProps) => {
  const video = parseVideoUrl(url);
  const [ativo, setAtivo] = useState(false);

  const formato = video.vertical ? "mx-auto w-full max-w-[320px] aspect-[9/16]" : "aspect-video";

  if (video.provider === "arquivo") {
    return (
      <video
        src={video.originalUrl}
        controls
        preload="none"
        playsInline
        className={cn("w-full rounded-2xl border border-border bg-foreground/5", formato, className)}
      />
    );
  }

  if (!video.embedUrl) {
    return (
      <a
        href={video.originalUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "hover-lift flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-secondary/40 text-foreground/70 hover:border-rose/40 hover:text-foreground",
          formato,
          className,
        )}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-soft">
          <Play className="h-5 w-5 text-rose" />
        </span>
        <span className="text-[13px] font-medium">Assistir no {providerLabel(video.provider)}</span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          abre em outra aba
          <ExternalLink className="h-3 w-3" />
        </span>
      </a>
    );
  }

  // O player só é carregado quando a aluna toca em assistir — deixa a abertura do app leve.
  if (!ativo && !previa) {
    return (
      <button
        type="button"
        onClick={() => setAtivo(true)}
        aria-label={titulo ? `Assistir: ${titulo}` : "Assistir vídeo"}
        className={cn(
          "group relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-border text-cream",
          "hero-surface",
          formato,
          className,
        )}
      >
        <span className="grain absolute inset-0 opacity-30" aria-hidden="true" />
        <span
          className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full opacity-40 blur-[70px]"
          style={{ background: "radial-gradient(circle, hsl(var(--rose) / 0.6), transparent 70%)" }}
          aria-hidden="true"
        />
        <span className="relative flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream/95 text-primary shadow-editorial transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cream/70">
            Assistir · {providerLabel(video.provider)}
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-foreground/5",
        formato,
        className,
      )}
    >
      <iframe
        src={previa ? video.embedUrl : comAutoplay(video.provider, video.embedUrl)}
        title={titulo ?? "Vídeo"}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
};
