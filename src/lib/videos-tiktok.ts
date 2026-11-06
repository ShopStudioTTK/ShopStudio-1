import "server-only";
import { db } from "@/lib/db";
import { NICHOS, type Nicho } from "@/content/nichos";

/**
 * Amostra de vídeos do TikTok sobre o produto do roteiro.
 * Quem busca é a Brave Search (índice público da web), não o nosso servidor no TikTok:
 * os termos do TikTok proíbem scraping. A tela mostra os vídeos com o player oficial.
 * O buscador não acompanha o que acabou de sair: são vídeos relevantes, não necessariamente recentes.
 * Os mais engajados vêm primeiro: a página de cada vídeo traz "19.1K Likes, 120 Comments", que a Brave
 * devolve nos trechos extras (visualizações o TikTok não publica ali). Testes e números: DEVLOG, 2026-11-06.
 * O resultado fica 3 dias em `videos_cache` e serve para termos parecidos, sem chamar a Brave de novo.
 */

export type VideoRelacionado = { url: string; titulo: string; outraLingua: boolean };

const MAX_VIDEOS = 6;
const MAX_CAMPEOES = 10;
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

const PARADAS = new Set("de da do das dos para com e o a os as em no na kit".split(" "));

/** Chave do cache: sem acento, sem palavras vazias nem plural, palavras em ordem. "Sérum de Vitamina C" → "c serum vitamina". */
export const normalizarTermo = (termo: string): string =>
  [...new Set((semAcento(termo).match(/[a-z0-9]+/g) ?? [])
    .filter((p) => !PARADAS.has(p))
    .map((p) => (p.length > 3 ? p.replace(/s$/, "") : p)))]
    .sort()
    .join(" ");

// ponytail: busca por trecho (sem acento e sem o "s" final), "cor" casa com "corpo"; índice de palavras se isso incomodar.
/** O vídeo fala do produto: ao menos 60% das palavras de 3+ letras aparecem no texto. Sem isso, vinha perfume na busca de pijama. */
export const relevante = (produto: string, texto: string): boolean => {
  const palavras = semAcento(produto).match(/[a-z0-9]{3,}/g) ?? [];
  const t = semAcento(texto);
  return palavras.filter((p) => t.includes(p.replace(/s$/, ""))).length >= Math.ceil(palavras.length * 0.6);
};

type Resultado = { url?: string; title?: string; description?: string; extra_snippets?: string[] };

/**
 * Só vídeos que passam no `filtro`. Português e idioma indefinido primeiro, do mais engajado ao menos
 * (sem número no fim), depois no máximo 2 em outra língua. Até `max`.
 */
const ordenar = (resultados: Resultado[] | undefined, filtro: (texto: string) => boolean, max: number): VideoRelacionado[] => {
  const vistos = new Set<string>();
  const candidatos: (VideoRelacionado & { nota: number })[] = [];
  for (const r of resultados ?? []) {
    const url = urlDoVideo(String(r.url ?? ""));
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    const texto = [r.title, r.description, ...(r.extra_snippets ?? [])].join(" ");
    if (!filtro(texto)) continue;
    const titulo = String(r.title ?? "").replace(/\s*\|\s*TikTok\s*$/i, "").trim().slice(0, 120);
    candidatos.push({ url, titulo, outraLingua: lingua(titulo) === "outra", nota: engajamento(texto) ?? -1 });
  }
  candidatos.sort((a, b) => b.nota - a.nota);
  const escolhidos = [
    ...candidatos.filter((v) => !v.outraLingua),
    ...candidatos.filter((v) => v.outraLingua).slice(0, MAX_OUTRA_LINGUA),
  ];
  return escolhidos.slice(0, max).map(({ url, titulo, outraLingua }) => ({ url, titulo, outraLingua }));
};

/** Vídeos do roteiro: só os que falam do produto, até 6. */
export const ordenarVideos = (resultados: Resultado[] | undefined, produto: string) =>
  ordenar(resultados, (texto) => relevante(produto, texto), MAX_VIDEOS);

const SINAL_DE_VENDA = [
  "achadinh", "achado", "comprei", "link", "shop", "shein", "cupom", "carrinho", "loja", "compra", "preco", "r$",
  "promo", "desconto", "mercado livre", "amazon", "provador", "unboxing", "vale a pena", "resenha", "testei",
];
// O público é feminino: "#modamasculina" aparecia em moda feminina.
const FORA_DO_PUBLICO = ["masculin"];

/** Vídeo de campeão: fala do nicho, tem sinal de venda e não é de moda masculina. */
export const doNicho = (nicho: Nicho, texto: string): boolean => {
  const t = semAcento(texto);
  return (
    nicho.palavras.some((p) => t.includes(p)) &&
    SINAL_DE_VENDA.some((p) => t.includes(p)) &&
    !FORA_DO_PUBLICO.some((p) => t.includes(p))
  );
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

// Calibrado em 2026-11-06 com pares reais (DEVLOG): 0,7 aceita "sérum vitamina c" × "…30ml" (0,77) e recusa
// "protetor solar facial" × "corporal" (0,53) e até "garrafa térmica" × "…1 litro" (0,67), de propósito:
// errar para menos só custa uma busca.
const SEMELHANCA_MINIMA = 0.7;

// Sem índice: a tabela tem uma linha por termo, e percorrer alguns milhares é rápido.
const doCache = async (termo: string): Promise<VideoRelacionado[] | null> => {
  try {
    const [linha] = await db()`
      select videos from public.videos_cache
      where criado_em > now() - interval '3 days'
        and extensions.similarity(termo, ${termo}) >= ${SEMELHANCA_MINIMA}
      order by extensions.similarity(termo, ${termo}) desc
      limit 1`;
    return (linha?.videos as VideoRelacionado[] | undefined) ?? null;
  } catch (e) {
    console.error("videos-tiktok: falha ao ler o cache", e);
    return null;
  }
};

const guardar = async (termo: string, videos: VideoRelacionado[]) => {
  try {
    await db()`
      insert into public.videos_cache (termo, videos) values (${termo}, ${JSON.stringify(videos)}::text::jsonb)
      on conflict (termo) do update set videos = excluded.videos, criado_em = now()`;
  } catch (e) {
    console.error("videos-tiktok: falha ao gravar o cache", e);
  }
};

export const buscarVideos = async (produto: string): Promise<VideoRelacionado[]> => {
  const chave = process.env.BRAVE_API_KEY;
  if (!chave) return [];
  const termo = produto.slice(0, 100);
  const chaveCache = normalizarTermo(termo);
  const salvos = chaveCache ? await doCache(chaveCache) : null;
  if (salvos) return salvos;
  const listas = await Promise.all(TERMOS.map((t) => buscar(`site:tiktok.com ${termo} ${t}`, chave)));
  const videos = ordenarVideos(listas.flat(), termo);
  // Lista vazia não vai para o cache: uma falha da Brave não fica presa por 3 dias.
  if (chaveCache && videos.length) await guardar(chaveCache, videos);
  return videos;
};

/**
 * Vídeos campeões de um nicho, iguais para todas as alunas: ficam 1 dia em `campeoes_cache` e são
 * buscados de novo por quem abrir a aba depois disso. Se a Brave falhar, fica o que estava salvo.
 */
// ponytail: atualiza na hora em que alguém abre a aba vencida (essa pessoa espera as buscas); um cron, se pesar.
export const buscarCampeoes = async (slug: string): Promise<VideoRelacionado[]> => {
  const nicho = NICHOS.find((n) => n.slug === slug);
  if (!nicho) return [];
  let salvo: { videos: VideoRelacionado[]; fresco: boolean } | undefined;
  try {
    [salvo] = (await db()`
      select videos, criado_em > now() - interval '1 day' as fresco
      from public.campeoes_cache where nicho = ${slug}`) as unknown as (typeof salvo)[];
  } catch (e) {
    console.error("videos-tiktok: falha ao ler os campeões", e);
  }
  if (salvo?.fresco) return salvo.videos;
  const chave = process.env.BRAVE_API_KEY;
  if (!chave) return salvo?.videos ?? [];
  const listas = await Promise.all(nicho.buscas.map((b) => buscar(`site:tiktok.com ${b}`, chave)));
  const videos = ordenar(listas.flat(), (texto) => doNicho(nicho, texto), MAX_CAMPEOES);
  if (!videos.length) return salvo?.videos ?? [];
  try {
    await db()`
      insert into public.campeoes_cache (nicho, videos) values (${slug}, ${JSON.stringify(videos)}::text::jsonb)
      on conflict (nicho) do update set videos = excluded.videos, criado_em = now()`;
  } catch (e) {
    console.error("videos-tiktok: falha ao gravar os campeões", e);
  }
  return videos;
};
