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

export const BUCKET_VIDEOS = "studio-videos";
const PREFIXO_BUCKET = `/storage/v1/object/public/${BUCKET_VIDEOS}/`;

/** Caminho do arquivo dentro do bucket de vídeos, se o link for dele (o bucket é privado: precisa assinar). */
export const caminhoNoBucket = (url: string): string | null => {
  const i = url.indexOf(PREFIXO_BUCKET);
  if (i < 0) return null;
  try {
    return decodeURIComponent(url.slice(i + PREFIXO_BUCKET.length).split(/[?#]/)[0]) || null;
  } catch {
    return null;
  }
};

/** Validade (segundos) da URL assinada dos vídeos do bucket. Valor inválido ou ausente: 1 h. */
export const validadeDaUrlAssinada = (valor: string | undefined): number => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 3600;
};

/** Aceita o link sem `https://` (o celular às vezes copia só `vt.tiktok.com/…`). */
const comoUrl = (url: string): URL | null => {
  const v = url.trim();
  try {
    return new URL(/^[a-z]+:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return null;
  }
};

/** Link de vídeo do TikTok no formato completo, sem query: `https://www.tiktok.com/@perfil/video/123`. Outro formato vira null. */
export const urlDoTiktok = (url: string): string | null => {
  const u = comoUrl(url);
  if (!u || u.protocol !== "https:" || !["www.tiktok.com", "tiktok.com"].includes(u.hostname)) return null;
  return /^\/@[\w.-]+\/video\/\d+$/.test(u.pathname) ? `https://www.tiktok.com${u.pathname}` : null;
};

/** Link curto que o app do celular copia (`https://vt.tiktok.com/ZS…/`), normalizado; outro formato vira null. */
export const linkCurtoDoTiktok = (url: string): string | null => {
  const u = comoUrl(url);
  if (!u || u.protocol !== "https:" || !["vt.tiktok.com", "vm.tiktok.com"].includes(u.hostname)) return null;
  return /^\/[A-Za-z0-9]+\/?$/.test(u.pathname) ? `https://${u.hostname}${u.pathname}` : null;
};

/** Link completo do vídeo; o link curto do celular é resolvido lendo o redirecionamento (só o `Location`, sem abrir a página). Só no servidor. */
export async function resolverUrlDoTiktok(url: string): Promise<string | null> {
  const completo = urlDoTiktok(url);
  if (completo) return completo;
  const curto = linkCurtoDoTiktok(url);
  if (!curto) return null;
  try {
    const res = await fetch(curto, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    return urlDoTiktok(res.headers.get("location") ?? "");
  } catch {
    return null;
  }
}

/**
 * Perfil da aluna no TikTok: aceita `@usuário`, o usuário solto ou um link do TikTok com `/@usuário`
 * e devolve `https://www.tiktok.com/@usuário`. Usuário do TikTok: 2 a 24 letras, números, `_` e `.`.
 */
export const perfilDoTiktok = (valor: string): string | null => {
  const v = valor.trim();
  const usuario = /^@?[\w.]+$/.test(v)
    ? v.replace(/^@/, "")
    : (() => {
        const u = comoUrl(v);
        if (!u || u.protocol !== "https:" || !["www.tiktok.com", "tiktok.com"].includes(u.hostname)) return null;
        return u.pathname.match(/^\/@([^/]+)/)?.[1] ?? null;
      })();
  return usuario && /^[\w.]{2,24}$/.test(usuario) ? `https://www.tiktok.com/@${usuario}` : null;
};
