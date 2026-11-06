import "server-only";

/**
 * Amostra de vídeos do TikTok sobre o produto do roteiro.
 * Quem busca é a Brave Search (índice público da web), não o nosso servidor no TikTok:
 * os termos do TikTok proíbem scraping. A tela mostra os vídeos com o player oficial.
 * O buscador não acompanha o que acabou de sair: são vídeos relevantes, não necessariamente recentes.
 */

export type VideoRelacionado = { url: string; titulo: string; outraLingua: boolean };

const MAX_VIDEOS = 6;
const MAX_OUTRA_LINGUA = 2;

// ponytail: heurística por palavras do título; a `language` da Brave erra (marcou título em português como "en").
const PT = new Set(
  "não você vocês uma meu minha isso esse essa muito melhor pele cabelo vale pena dica dicas achei amei comprei loja também ótimo gente resenha completa da do dos das em é ou seu sua produto testei".split(" "),
);
const OUTRA = new Set(
  "the and my with this you for best how is to of it el los las la del y tu muy mejor mejores este esta compré pero mi mis con una hola piel cabello producto reseña".split(" "),
);

export const lingua = (titulo: string): "pt" | "outra" | "?" => {
  const t = titulo.toLowerCase();
  const palavras = t.match(/[a-zà-ÿ]+/g) ?? [];
  const pt = palavras.filter((p) => PT.has(p)).length + 2 * (t.match(/[ãõç]/g)?.length ?? 0);
  const outra = palavras.filter((p) => OUTRA.has(p)).length + 2 * (t.match(/[ñ¿¡]/g)?.length ?? 0);
  return pt > outra ? "pt" : outra > pt ? "outra" : "?";
};

const urlDoVideo = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !["www.tiktok.com", "tiktok.com"].includes(u.hostname)) return null;
    return /^\/@[\w.-]+\/video\/\d+$/.test(u.pathname) ? `https://www.tiktok.com${u.pathname}` : null;
  } catch {
    return null;
  }
};

/** Português primeiro, depois os sem idioma claro, e no máximo 2 em outra língua; a ordem do buscador é mantida. */
export const ordenarVideos = (resultados: { url?: string; title?: string }[] | undefined): VideoRelacionado[] => {
  const vistos = new Set<string>();
  const grupos = { pt: [] as VideoRelacionado[], "?": [] as VideoRelacionado[], outra: [] as VideoRelacionado[] };
  for (const r of resultados ?? []) {
    const url = urlDoVideo(String(r.url ?? ""));
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    const titulo = String(r.title ?? "").replace(/\s*\|\s*TikTok\s*$/i, "").trim().slice(0, 120);
    const l = lingua(titulo);
    grupos[l].push({ url, titulo, outraLingua: l === "outra" });
  }
  return [...grupos.pt, ...grupos["?"], ...grupos.outra.slice(0, MAX_OUTRA_LINGUA)].slice(0, MAX_VIDEOS);
};

export const buscarVideos = async (produto: string): Promise<VideoRelacionado[]> => {
  const chave = process.env.BRAVE_API_KEY;
  if (!chave) return [];
  // "resenha" puxa vídeos em português de quem usou o produto (testado em 2026-11-05).
  const params = new URLSearchParams({
    q: `site:tiktok.com ${produto.slice(0, 100)} resenha`,
    country: "BR",
    search_lang: "pt-br",
    count: "20",
  });
  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: { Accept: "application/json", "X-Subscription-Token": chave },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("videos-tiktok: Brave respondeu", res.status);
      return [];
    }
    return ordenarVideos((await res.json())?.web?.results);
  } catch (e) {
    console.error("videos-tiktok: falha na busca", e);
    return [];
  }
};
