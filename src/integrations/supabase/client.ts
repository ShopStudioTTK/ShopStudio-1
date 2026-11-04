import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // No servidor (pré-render dos componentes cliente) não existe localStorage.
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      // Login com Google: o retorno traz ?code= e o cliente troca pela sessão sozinho.
      flowType: "pkce",
    },
  },
);
