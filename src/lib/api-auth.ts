import "server-only";
import { temAcesso } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const erro = (message: string, status: number) =>
  Response.json({ error: { message } }, { status });

export type Autorizado = {
  apiKey: string;
  model: string;
  supabase: ReturnType<typeof createAdminClient>;
  userId: string;
};

/**
 * Checagens comuns das rotas de IA, nesta ordem: env da OpenRouter → token → acesso.
 * Devolve uma Response de erro pronta ou os dados para seguir.
 */
export async function autorizar(
  req: Request,
  rotulo: string,
  msgLogin: string,
): Promise<Autorizado | Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) return erro("IA não configurada.", 500);

  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return erro(msgLogin, 401);

  let supabase: ReturnType<typeof createAdminClient>;
  let userId: string | undefined;
  try {
    supabase = createAdminClient();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    userId = authError ? undefined : auth?.user?.id;
  } catch (e) {
    console.error(`${rotulo}: falha ao verificar login`, e);
    return erro("Não consegui verificar seu login agora. Tente de novo.", 500);
  }
  if (!userId) return erro(msgLogin, 401);

  const { data: entitlement, error: entError } = await supabase
    .from("entitlements")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (entError) {
    console.error(`${rotulo}: falha ao ler entitlement`, entError);
    return erro("Não consegui verificar seu acesso agora.", 500);
  }
  if (!temAcesso(Boolean(entitlement))) return erro("Seu acesso ainda não foi liberado.", 403);

  return { apiKey, model, supabase, userId };
}

export const chamarOpenRouter = (apiKey: string, body: object) =>
  fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Shop Studio",
    },
    body: JSON.stringify(body),
  });
