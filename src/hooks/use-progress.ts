import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const useChapterProgress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["chapter-progress", user?.id];

  const { data = [] } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_progress")
        .select("chapter_slug")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const completed = useMemo(
    () => new Set(data.map((row) => row.chapter_slug)),
    [data],
  );

  const mutation = useMutation({
    mutationFn: async ({ slug, done }: { slug: string; done: boolean }) => {
      if (!user?.id) throw new Error("Sessão expirada.");
      if (done) {
        const { error } = await supabase
          .from("chapter_progress")
          .upsert(
            { user_id: user.id, chapter_slug: slug },
            { onConflict: "user_id,chapter_slug" },
          );
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("chapter_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("chapter_slug", slug);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    completed,
    isCompleted: (slug: string) => completed.has(slug),
    setChapterCompleted: (slug: string, done: boolean) =>
      mutation.mutate({ slug, done }),
    pending: mutation.isPending,
  };
};

export const useChecklistProgress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["checklist-progress", user?.id];

  const { data = [] } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_progress")
        .select("item_key")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const done = useMemo(() => new Set(data.map((row) => row.item_key)), [data]);

  const mutation = useMutation({
    mutationFn: async ({ key, checked }: { key: string; checked: boolean }) => {
      if (!user?.id) throw new Error("Sessão expirada.");
      if (checked) {
        const { error } = await supabase
          .from("checklist_progress")
          .upsert(
            { user_id: user.id, item_key: key, done: true },
            { onConflict: "user_id,item_key" },
          );
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("checklist_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("item_key", key);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    done,
    isDone: (key: string) => done.has(key),
    toggle: (key: string, checked: boolean) =>
      mutation.mutate({ key, checked }),
  };
};
