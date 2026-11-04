export type VideoProvider = "youtube" | "vimeo" | "tiktok" | "arquivo" | "externo";

export type ParsedVideo = {
  provider: VideoProvider;
  embedUrl: string | null;
  originalUrl: string;
  vertical: boolean;
};

export const parseVideoUrl = (url: string): ParsedVideo => {
  const value = url.trim();

  const youtubeMatch = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (youtubeMatch) {
    return {
      provider: "youtube",
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0`,
      originalUrl: value,
      vertical: /shorts\//.test(value),
    };
  }

  const vimeoMatch = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      provider: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      originalUrl: value,
      vertical: false,
    };
  }

  const tiktokMatch = value.match(/tiktok\.com\/(?:@[^/]+\/)?(?:video|photo)\/(\d+)/);
  if (tiktokMatch) {
    return {
      provider: "tiktok",
      embedUrl: `https://www.tiktok.com/player/v1/${tiktokMatch[1]}?music_info=0&description=0&rel=0`,
      originalUrl: value,
      vertical: true,
    };
  }

  if (/\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(value)) {
    return { provider: "arquivo", embedUrl: value, originalUrl: value, vertical: true };
  }

  return { provider: "externo", embedUrl: null, originalUrl: value, vertical: true };
};

export const providerLabel = (provider: VideoProvider) =>
  provider === "youtube"
    ? "YouTube"
    : provider === "vimeo"
      ? "Vimeo"
      : provider === "tiktok"
        ? "TikTok"
        : provider === "arquivo"
          ? "Arquivo de vídeo"
          : "Link externo";
