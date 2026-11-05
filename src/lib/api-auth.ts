import "server-only";
import type { User } from "@supabase/supabase-js";
import { temAcesso } from "@/lib/access";
import { estadoDaSenhaTemporaria } from "@/lib/contas";
import { db } from "@/lib/db";
import { inicioDoDiaSP } from "@/lib/limite";
import type { Uso } from "@/lib/uso";
import { createAdminClient } from "@/lib/supabase/admin";

export const erro = (message: string, status: number) =>
  Response.json({ error: { message } }, { status });

export type Logada = { user: User; userId: string };
export type Autorizado = Logada & { apiKey: string; model: string };

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

  const auth = await autenticar(req, rotulo, msgLogin);
  return auth instanceof Response ? auth : { apiKey, model, ...auth };
}

/**
 * Token válido, conferido no Supabase Auth (não só decodificado). Não checa acesso: serve
 * só para o que vem antes dele (perfil e tela de código). O resto usa autenticar().
 */
export async function logada(req: Request, rotulo: string, msgLogin: string): Promise<Logada | Response> {
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return erro(msgLogin, 401);

  let user: User | null | undefined;
  try {
    const { data, error } = await createAdminClient().auth.getUser(token);
    user = error ? null : data?.user;
  } catch (e) {
    console.error(`${rotulo}: falha ao verificar login`, e);
    return erro("Não consegui verificar seu login agora. Tente de novo.", 500);
  }
  if (!user) return erro(msgLogin, 401);
  return { user, userId: user.id };
}

export const MSG_SENHA = {
  pendente: "Defina sua senha nova antes de continuar.",
  expirada: "Sua senha temporária expirou. Peça uma nova ao suporte do Shop Studio.",
} as const;

export const possuiEntitlement = async (userId: string) =>
  (await db()`select 1 from public.entitlements where user_id = ${userId}`).length > 0;

/**
 * Token válido (logada), senha temporária já trocada e acesso liberado (`temAcesso`).
 * Vale para todo conteúdo e dado da plataforma.
 */
export async function autenticar(req: Request, rotulo: string, msgLogin: string): Promise<Logada | Response> {
  const auth = await logada(req, rotulo, msgLogin);
  if (auth instanceof Response) return auth;
  let senha: Awaited<ReturnType<typeof estadoDaSenhaTemporaria>>;
  let possui: boolean;
  try {
    senha = await estadoDaSenhaTemporaria(auth.userId);
    possui = !senha && (await possuiEntitlement(auth.userId));
  } catch (e) {
    console.error(`${rotulo}: falha ao ler entitlement`, e);
    return erro("Não consegui verificar seu acesso agora.", 500);
  }
  if (senha) return erro(MSG_SENHA[senha], 403);
  if (!temAcesso(possui)) return erro("Seu acesso ainda não foi liberado.", 403);
  return auth;
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

export type Rota = "assistente" | "roteiro";

type ConfigDaIA = { nome: string | null; tom: string | null; persona: string | null; evitar: string | null; exemplos: string | null };

/** Persona e base de conhecimento da IA. São opcionais: se a leitura falhar, a IA segue sem elas. */
export async function configDaIA(): Promise<{ config: ConfigDaIA | null; knowledge: { titulo: string; conteudo: string }[] }> {
  try {
    const sql = db();
    const [config] = await sql`select nome, tom, persona, evitar, exemplos from public.ai_config where id = 'default'`;
    const knowledge = await sql`select titulo, conteudo from public.ai_knowledge order by ordem`;
    return { config: (config ?? null) as ConfigDaIA | null, knowledge: knowledge as unknown as { titulo: string; conteudo: string }[] };
  } catch (e) {
    console.error("falha ao ler a configuração da IA", e);
    return { config: null, knowledge: [] };
  }
}

/** Quantas chamadas a aluna já fez hoje (horário de Brasília) nesta rota. */
export const chamadasDeHoje = async (userId: string, rota: Rota): Promise<number> => {
  const [{ usadas }] = await db()`
    select count(*)::int as usadas from public.ai_perguntas
    where user_id = ${userId} and rota = ${rota} and created_at >= ${inicioDoDiaSP()}`;
  return usadas;
};

/**
 * Conta as chamadas de hoje e, abaixo do limite, já grava esta.
 * ponytail: contar e gravar não é atômico; duas abas ao mesmo tempo podem passar 1 do limite.
 */
export async function reservarChamada(
  userId: string,
  rota: Rota,
  limite: number,
  msgLimite: (usadas: number) => string,
  pergunta: string,
  capitulo: string | null = null,
): Promise<{ id: string; usadas: number } | Response> {
  let usadas: number;
  try {
    usadas = await chamadasDeHoje(userId, rota);
  } catch (e) {
    console.error(`${rota}: falha ao contar chamadas`, e);
    return erro("Não consegui verificar seu limite agora.", 500);
  }
  if (usadas >= limite) return erro(msgLimite(usadas), 429);
  try {
    const [{ id }] = await db()`
      insert into public.ai_perguntas (user_id, rota, pergunta, capitulo)
      values (${userId}, ${rota}, ${pergunta}, ${capitulo}) returning id`;
    return { id, usadas };
  } catch (e) {
    console.error(`${rota}: falha ao gravar chamada`, e);
    return erro("Não consegui registrar seu pedido agora.", 500);
  }
}

/** Chamada que a IA não atendeu não conta no limite. */
export const liberarChamada = async (id: string) => {
  await db()`delete from public.ai_perguntas where id = ${id}`;
};

export async function registrarCusto(id: string, uso: Uso | null | undefined) {
  if (!uso) return;
  try {
    await db()`
      update public.ai_perguntas set
        tokens_entrada = ${uso.prompt_tokens ?? null},
        tokens_saida = ${uso.completion_tokens ?? null},
        tokens_cache = ${uso.prompt_tokens_details?.cached_tokens ?? null},
        custo_usd = ${uso.cost ?? null}
      where id = ${id}`;
  } catch (e) {
    console.error("falha ao gravar custo", e);
  }
}
