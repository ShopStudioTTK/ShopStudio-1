import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const createAdminClient = (): SupabaseClient<Database> =>
  createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

/**
 * Confere a senha pelo próprio login do Supabase e encerra na hora a sessão que ele abre.
 * ponytail: o limite de logins por IP do Supabase conta o IP do servidor, igual para todas as
 * alunas; se começar a dar "limite", conferir pelo hash de auth.users com um limite próprio.
 */
export async function conferirSenha(email: string, password: string): Promise<"ok" | "errada" | "limite"> {
  const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await cliente.auth.signInWithPassword({ email, password });
  if (!error) {
    await cliente.auth.signOut({ scope: "local" });
    return "ok";
  }
  if (error.code === "invalid_credentials") return "errada";
  if (error.status === 429) return "limite";
  throw error;
}
