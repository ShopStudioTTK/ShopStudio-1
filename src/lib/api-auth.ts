import "server-only";
import { temAcesso } from "@/lib/access";
import { inicioDoDiaSP } from "@/lib/limite";
import type { Uso } from "@/lib/uso";
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

/**
 * Provedores do modelo DeepSeek v4.1 Flash: Morph primeiro (mais barato em fp8, cache confiável
 * nos testes), DeepInfra de reserva. Só fp8: as versões fp4 respondem pior.
 * Revisar ao trocar OPENROUTER_MODEL — outros modelos têm outros provedores.
 */
export const PROVEDORES = { order: ["morph/fp8", "deepinfra/fp8"], quantizations: ["fp8"] };

export const chamarOpenRouter = (apiKey: string, body: object) =>
  fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Shop Studio",
    },
    body: JSON.stringify({ provider: PROVEDORES, ...body }),
  });

type Admin = ReturnType<typeof createAdminClient>;
export type Rota = "assistente" | "roteiro";

/**
 * Conta as chamadas de hoje (horário de Brasília) e, abaixo do limite, já grava esta.
 * ponytail: contar e gravar não é atômico; duas abas ao mesmo tempo podem passar 1 do limite.
 */
export async function reservarChamada(
  supabase: Admin,
  userId: string,
  rota: Rota,
  limite: number,
  msgLimite: (usadas: number) => string,
  pergunta: string,
  capitulo: string | null = null,
): Promise<{ id: string; usadas: number } | Response> {
  const { count, error: countError } = await supabase
    .from("ai_perguntas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("rota", rota)
    .gte("created_at", inicioDoDiaSP().toISOString());
  if (countError) {
    console.error(`${rota}: falha ao contar chamadas`, countError);
    return erro("Não consegui verificar seu limite agora.", 500);
  }
  const usadas = count ?? 0;
  if (usadas >= limite) return erro(msgLimite(usadas), 429);

  const { data, error } = await supabase
    .from("ai_perguntas")
    .insert({ user_id: userId, rota, pergunta, capitulo })
    .select("id")
    .single();
  if (error || !data) {
    console.error(`${rota}: falha ao gravar chamada`, error);
    return erro("Não consegui registrar seu pedido agora.", 500);
  }
  return { id: data.id, usadas };
}

/** Chamada que a IA não atendeu não conta no limite. */
export const liberarChamada = (supabase: Admin, id: string) =>
  supabase.from("ai_perguntas").delete().eq("id", id);

export async function registrarCusto(supabase: Admin, id: string, uso: Uso | null | undefined) {
  if (!uso) return;
  const { error } = await supabase
    .from("ai_perguntas")
    .update({
      tokens_entrada: uso.prompt_tokens,
      tokens_saida: uso.completion_tokens,
      tokens_cache: uso.prompt_tokens_details?.cached_tokens,
      custo_usd: uso.cost,
    })
    .eq("id", id);
  if (error) console.error("falha ao gravar custo", error);
}
