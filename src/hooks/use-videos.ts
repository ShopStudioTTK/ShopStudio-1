import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

export type ChapterVideo = {
  id: string;
  chapter_slug: string | null;
  titulo: string;
  descricao: string | null;
  url: string;
  ordem: number;
  updated_at: string;
};

export const useChapterVideos = (chapterSlug?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["chapter-videos", chapterSlug],
    enabled: Boolean(user?.id && chapterSlug),
    queryFn: async () =>
      (await api<{ videos: ChapterVideo[] }>(`/api/videos?capitulo=${encodeURIComponent(chapterSlug!)}`)).videos,
  });
};
