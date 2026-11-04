import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
      return (data ?? []) as ChapterVideo[];
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
      return (data ?? []) as ChapterVideo[];
    },
  });
};
