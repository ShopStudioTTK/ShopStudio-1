import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BUCKET_VIDEOS, caminhoNoBucket, validadeDaUrlAssinada } from "@/lib/video";

export type ChapterVideo = {
  id: string;
  chapter_slug: string | null;
  colecao: string;
  titulo: string;
  descricao: string | null;
  url: string;
  ordem: number;
  updated_at: string;
};

const select = "id, chapter_slug, colecao, titulo, descricao, url, ordem, updated_at";

// NEXT_PUBLIC_*: o valor entra no build. Trocar no .env exige reiniciar o dev ou fazer novo deploy.
const VALIDADE = validadeDaUrlAssinada(process.env.NEXT_PUBLIC_VIDEO_URL_VALIDADE_SEGUNDOS);

/**
 * O bucket de vídeos é privado: link de arquivo dele vira URL assinada, gerada com a sessão
 * da aluna e válida por VALIDADE segundos (o react-query busca de novo ao voltar para a aba).
 * Dentro desse prazo a URL pode ser repassada: prazo menor = menos tempo de link vazado.
 */
const assinar = async (videos: ChapterVideo[]): Promise<ChapterVideo[]> => {
  const caminhos = videos.map((v) => caminhoNoBucket(v.url)).filter((c): c is string => c !== null);
  if (!caminhos.length) return videos;
  const { data, error } = await supabase.storage.from(BUCKET_VIDEOS).createSignedUrls(caminhos, VALIDADE);
  if (error) throw error;
  const assinadas = new Map(data.map((d) => [d.path, d.signedUrl]));
  return videos.map((v) => {
    const caminho = caminhoNoBucket(v.url);
    return caminho ? { ...v, url: assinadas.get(caminho) ?? "" } : v;
  }).filter((v) => v.url);
};

export const useChapterVideos = (chapterSlug?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chapter-videos", chapterSlug],
    enabled: Boolean(user?.id && chapterSlug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_videos")
        .select(select)
        .eq("chapter_slug", chapterSlug!)
        .order("ordem", { ascending: true })
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return assinar((data ?? []) as ChapterVideo[]);
    },
  });
};

export const useChampionVideos = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chapter-videos", "campeoes"],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_videos")
        .select(select)
        .eq("colecao", "campeao")
        .order("ordem", { ascending: true })
        .order("updated_at", { ascending: true });
      if (error) throw error;
      return assinar((data ?? []) as ChapterVideo[]);
    },
  });
};
