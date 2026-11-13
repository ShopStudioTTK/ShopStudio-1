import "server-only";
import type { User } from "@supabase/supabase-js";
import { temAcesso } from "@/lib/access";
import { estadoDaSenhaTemporaria } from "@/lib/contas";
import { db } from "@/lib/db";
import { LIMITE_SEMANAL, MSG_SEM_CREDITOS, semanaSP, type Quantidades, type Saldo, type TipoDeCredito } from "@/lib/limite";
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

export const ehAdmin = async (userId: string) =>
  (await db()`select 1 from public.admins where user_id = ${userId}`).length > 0;

/**
 * autenticar() + a conta está em `admins`, conferido no banco a cada chamada (sem cache, sem
 * nada do navegador ou do JWT). A tabela só muda pelo painel do Supabase.
 */
export async function admin(req: Request, rotulo: string): Promise<Logada | Response> {
  const auth = await autenticar(req, rotulo, "Faça login.");
  if (auth instanceof Response) return auth;
  let ok: boolean;
  try {
    ok = await ehAdmin(auth.userId);
  } catch (e) {
    console.error(`${rotulo}: falha ao ler admins`, e);
    return erro("Não consegui verificar seu acesso agora.", 500);
  }
  return ok ? auth : erro("Acesso restrito à administração.", 403);
}

/**
 * Provedores do modelo DeepSeek v4.1 Flash: DeepInfra primeiro e Morph de reserva (a ordem foi
 * invertida em 2026-11-12; antes era Morph primeiro). Só fp8: as versões fp4 respondem pior.
 * Revisar ao trocar OPENROUTER_MODEL — outros modelos têm outros provedores.
 */
export const PROVEDORES = { order: ["deepinfra/fp8", "morph/fp8"], quantizations: ["fp8"] };

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

/**
 * Reserva de uma chamada de IA: de onde saiu o crédito, para devolver ao mesmo lugar. `semana` =
 * crédito da semana; `lote` = crédito comprado (creditos_comprados.id); os dois nulos = admin.
 */
export type Reserva = { id: string; userId: string; rota: Rota; semana: string | null; lote: string | null };

/**
 * Quanto resta à aluna: da semana (tipo sem linha = nada gasto) e dos comprados ainda válidos, com o
 * vencimento do lote que vence primeiro.
 */
export const creditosRestantes = async (userId: string): Promise<Saldo> => {
  const [semana, lotes] = await Promise.all([
    db()`select rota, gastos from public.creditos_semana where user_id = ${userId} and semana = ${semanaSP()}`,
    db()`
      select rota, sum(quantidade - gastos)::int restantes, min(vale_ate) vence from public.creditos_comprados
      where user_id = ${userId} and vale_ate > now() and gastos < quantidade group by rota`,
  ]);
  const gasto = (tipo: TipoDeCredito) => Number(semana.find((l) => l.rota === tipo)?.gastos ?? 0);
  const comprado = (tipo: TipoDeCredito) => Number(lotes.find((l) => l.rota === tipo)?.restantes ?? 0);
  const vence = lotes.map((l) => new Date(l.vence).getTime()).sort((a, b) => a - b)[0];
  return {
    restantes: { assistente: LIMITE_SEMANAL.assistente - gasto("assistente"), roteiro: LIMITE_SEMANAL.roteiro - gasto("roteiro") },
    comprados: { assistente: comprado("assistente"), roteiro: comprado("roteiro") },
    vencimento: vence ? new Date(vence).toISOString() : null,
  };
};

/**
 * Credita uma compra: um lote por tipo com quantidade, que vale 30 dias a partir de agora, numa
 * consulta só (o combo entra inteiro ou nada). Para a plataforma de venda chamar quando existir.
 */
export const darCreditos = async (userId: string, q: Quantidades) => {
  if (![q.assistente, q.roteiro].every((n) => Number.isInteger(n) && n >= 0)) throw new Error("quantidade inválida");
  await db()`
    insert into public.creditos_comprados (user_id, rota, quantidade, vale_ate)
    select ${userId}, r, q, now() + interval '30 days'
    from unnest(array['assistente', 'roteiro']::text[], array[${q.assistente}, ${q.roteiro}]::int[]) as t(r, q)
    where q > 0`;
};

/**
 * Reserva 1 crédito do tipo da rota (numa consulta só, que só soma se ainda couber no limite da
 * semana; esgotada, numa consulta só no lote comprado) e grava a chamada em ai_perguntas. Cada pedido gasta 1, do tamanho que for.
 * Admin (`ilimitada`) não mexe em créditos. `pedido` (uuid do navegador) é o que a tela usa para
 * retomar a resposta depois do F5 (GET /api/pedidos).
 */
export async function reservarChamada(
  userId: string,
  rota: Rota,
  ilimitada: boolean,
  pergunta: string,
  capitulo: string | null = null,
  pedido: string | null = null,
): Promise<Reserva | Response> {
  const reserva: Reserva = { id: "", userId, rota, semana: null, lote: null };
  if (!ilimitada) {
    const semana = semanaSP();
    try {
      // Primeiro a semana; esgotada, o lote comprado válido que vence primeiro.
      const daSemana = await db()`
        insert into public.creditos_semana (user_id, semana, rota, gastos) values (${userId}, ${semana}, ${rota}, 1)
        on conflict (user_id, semana, rota) do update set gastos = creditos_semana.gastos + 1
        where creditos_semana.gastos + 1 <= ${LIMITE_SEMANAL[rota]}
        returning gastos`;
      if (daSemana.length > 0) reserva.semana = semana;
      else {
        const [lote] = await db()`
          update public.creditos_comprados set gastos = gastos + 1
          where id = (
            select id from public.creditos_comprados
            where user_id = ${userId} and rota = ${rota} and vale_ate > now() and gastos < quantidade
            order by vale_ate limit 1 for update skip locked)
          returning id`;
        reserva.lote = lote?.id ?? null;
      }
    } catch (e) {
      console.error(`${rota}: falha ao reservar crédito`, e);
      return erro("Não consegui verificar seus créditos agora.", 500);
    }
    if (!reserva.semana && !reserva.lote) return erro(MSG_SEM_CREDITOS[rota], 429);
  }
  try {
    const [{ id }] = await db()`
      insert into public.ai_perguntas (user_id, rota, pergunta, capitulo, pedido)
      values (${userId}, ${rota}, ${pergunta}, ${capitulo}, ${pedido}) returning id`;
    return { ...reserva, id };
  } catch (e) {
    console.error(`${rota}: falha ao gravar chamada`, e);
    await devolverCredito(reserva);
    return erro("Não consegui registrar seu pedido agora.", 500);
  }
}

/** A aluna não recebeu resposta: o crédito reservado volta. */
export const devolverCredito = async (r: Reserva) => {
  const falhou = (e: unknown) => console.error(`${r.rota}: falha ao devolver crédito`, e);
  if (r.lote)
    await db()`
      update public.creditos_comprados set gastos = greatest(0, gastos - 1)
      where id = ${r.lote} and user_id = ${r.userId}`.catch(falhou);
  else if (r.semana)
    await db()`
      update public.creditos_semana set gastos = greatest(0, gastos - 1)
      where user_id = ${r.userId} and semana = ${r.semana} and rota = ${r.rota}`.catch(falhou);
};

export const liberarChamada = async (r: Reserva) => {
  await devolverCredito(r);
  await db()`delete from public.ai_perguntas where id = ${r.id}`;
};

/** Guarda o que a rota devolveu à aluna, para ela retomar depois do F5 (GET /api/pedidos). */
export async function guardarResultado(id: string, status: number, corpo: unknown) {
  // como texto, e o banco converte; senão o driver grava o JSON como string
  await db()`
    update public.ai_perguntas set resultado = ${JSON.stringify({ status, corpo })}::text::jsonb
    where id = ${id}`.catch((e) => console.error("falha ao guardar o resultado do pedido", e));
}

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
