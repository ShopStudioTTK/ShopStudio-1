"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { temAcesso } from "@/lib/access";

export const useAccess = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const entitlementKey = ["entitlement", user?.id];

  const entitlementQuery = useQuery({
    queryKey: entitlementKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entitlements")
        .select("user_id, origem, criado_em")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const redeem = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc("redeem_access_code", {
        codigo_input: code.trim(),
      });
      if (error) throw new Error("Não consegui validar o código agora. Tente de novo.");
      return Boolean(data);
    },
    onSuccess: (liberado) => {
      if (liberado) {
        void queryClient.invalidateQueries({ queryKey: entitlementKey });
      }
    },
  });

  return {
    hasAccess: temAcesso(Boolean(entitlementQuery.data)),
    isLoading: entitlementQuery.isLoading,
    redeem,
  };
};
