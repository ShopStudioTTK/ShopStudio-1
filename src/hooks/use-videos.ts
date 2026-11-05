import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

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

const buscar = async (consulta: string) => (await api<{ videos: ChapterVideo[] }>(`/api/videos?${consulta}`)).videos;

export const useChapterVideos = (chapterSlug?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chapter-videos", chapterSlug],
    enabled: Boolean(user?.id && chapterSlug),
    queryFn: () => buscar(`capitulo=${encodeURIComponent(chapterSlug!)}`),
  });
};

export const useChampionVideos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chapter-videos", "campeoes"],
    enabled: Boolean(user?.id),
    queryFn: () => buscar("colecao=campeao"),
  });
};
