import "server-only";

/**
 * Amostra de vídeos do TikTok sobre o produto do roteiro.
 * Quem busca é a Brave Search (índice público da web), não o nosso servidor no TikTok:
 * os termos do TikTok proíbem scraping. A tela mostra os vídeos com o player oficial.
 * O buscador não acompanha o que acabou de sair: são vídeos relevantes, não necessariamente recentes.
 * Os mais engajados vêm primeiro: a página de cada vídeo traz "19.1K Likes, 120 Comments", que a Brave
 * devolve nos trechos extras (visualizações o TikTok não publica ali). Testes e números: DEVLOG, 2026-11-06.
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

const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
const numero = (n: string, sufixo: string) => Math.round(parseFloat(n.replace(/,/g, "")) * (mult[sufixo.toUpperCase()] ?? 1));

/** Curtidas + 3 × comentários, lidos do texto que o TikTok publica na página; null se não houver. */
export const engajamento = (texto: string): number | null => {
  const m = texto.match(/([\d.,]+)([KMB]?) Likes, ([\d.,]+)([KMB]?) Comments/i);
  return m ? numero(m[1], m[2]) + 3 * numero(m[3], m[4]) : null;
};

const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ponytail: busca por trecho (sem acento e sem o "s" final), "cor" casa com "corpo"; índice de palavras se isso incomodar.
/** O vídeo fala do produto: ao menos 60% das palavras de 3+ letras aparecem no texto. Sem isso, vinha perfume na busca de pijama. */
export const relevante = (produto: string, texto: string): boolean => {
  const palavras = semAcento(produto).match(/[a-z0-9]{3,}/g) ?? [];
  const t = semAcento(texto);
  return palavras.filter((p) => t.includes(p.replace(/s$/, ""))).length >= Math.ceil(palavras.length * 0.6);
};

type Resultado = { url?: string; title?: string; description?: string; extra_snippets?: string[] };

/**
 * Só vídeos que falam do produto. Português e idioma indefinido primeiro, do mais engajado ao menos
 * (sem número no fim), depois no máximo 2 em outra língua. Até 6.
 */
export const ordenarVideos = (resultados: Resultado[] | undefined, produto: string): VideoRelacionado[] => {
  const vistos = new Set<string>();
  const candidatos: (VideoRelacionado & { nota: number })[] = [];
  for (const r of resultados ?? []) {
    const url = urlDoVideo(String(r.url ?? ""));
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    const texto = [r.title, r.description, ...(r.extra_snippets ?? [])].join(" ");
    if (!relevante(produto, texto)) continue;
    const titulo = String(r.title ?? "").replace(/\s*\|\s*TikTok\s*$/i, "").trim().slice(0, 120);
    candidatos.push({ url, titulo, outraLingua: lingua(titulo) === "outra", nota: engajamento(texto) ?? -1 });
  }
  candidatos.sort((a, b) => b.nota - a.nota);
  const escolhidos = [
    ...candidatos.filter((v) => !v.outraLingua),
    ...candidatos.filter((v) => v.outraLingua).slice(0, MAX_OUTRA_LINGUA),
  ];
  return escolhidos.slice(0, MAX_VIDEOS).map(({ url, titulo, outraLingua }) => ({ url, titulo, outraLingua }));
};

// Testados em 2026-11-06: 3 termos diferentes trazem ~50 vídeos por produto; 3 páginas do mesmo termo, ~20.
const TERMOS = ['(resenha OR "vale a pena" OR testei)', "(achadinho OR comprei OR amei)", "(review OR unboxing OR favorito)"];
// Goggle da Brave: descarta o que não é página de vídeo (as /discover ocupavam metade dos 20 resultados).
const SO_VIDEOS = "! name: so-videos\n$discard\n/video/$boost=3,site=tiktok.com";

const buscar = async (q: string, chave: string): Promise<Resultado[]> => {
  const params = new URLSearchParams({
    q,
    country: "BR",
    search_lang: "pt-br",
    count: "20",
    extra_snippets: "true",
    goggles: SO_VIDEOS,
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
    return (await res.json())?.web?.results ?? [];
  } catch (e) {
    console.error("videos-tiktok: falha na busca", e);
    return [];
  }
};

export const buscarVideos = async (produto: string): Promise<VideoRelacionado[]> => {
  const chave = process.env.BRAVE_API_KEY;
  if (!chave) return [];
  const termo = produto.slice(0, 100);
  const listas = await Promise.all(TERMOS.map((t) => buscar(`site:tiktok.com ${termo} ${t}`, chave)));
  return ordenarVideos(listas.flat(), termo);
};
