import { temAcesso } from "@/lib/access";
import {
  buildSystemPrompt,
  buildUserPrompt,
  extractScriptJson,
} from "@/lib/roteiro";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const erro = (message: string, status: number) =>
  Response.json({ error: { message } }, { status });

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) return erro("IA não configurada.", 500);

  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return erro("Faça login para gerar roteiros.", 401);

  let supabase: ReturnType<typeof createAdminClient>;
  let userId: string | undefined;
  try {
    supabase = createAdminClient();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    userId = authError ? undefined : auth?.user?.id;
  } catch (e) {
    console.error("roteiro: falha ao verificar login", e);
    return erro("Não consegui verificar seu login agora. Tente de novo.", 500);
  }
  if (!userId) return erro("Faça login para gerar roteiros.", 401);

  const { data: entitlement, error: entError } = await supabase
    .from("entitlements")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (entError) {
    console.error("roteiro: falha ao ler entitlement", entError);
    return erro("Não consegui verificar seu acesso agora.", 500);
  }
  if (!temAcesso(Boolean(entitlement)))
    return erro("Seu acesso ainda não foi liberado.", 403);

  const body = await req.json().catch(() => null);
  const field = (k: string) => String(body?.[k] ?? "").trim().slice(0, 500);
  const input = {
    produto: field("produto"),
    publico: field("publico"),
    beneficio: field("beneficio"),
    formato: field("formato"),
  };
  if (!input.produto) return erro("Diga qual é o produto.", 400);

  // treino e base de conhecimento são opcionais
  const { data: config } = await supabase
    .from("ai_config")
    .select("tom, persona, evitar")
    .eq("id", "default")
    .maybeSingle();
  const { data: knowledge } = await supabase
    .from("ai_knowledge")
    .select("titulo, conteudo")
    .order("ordem", { ascending: true });

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Shop Studio",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(config ?? null, knowledge ?? []),
          },
          { role: "user", content: buildUserPrompt(input) },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });
  } catch (e) {
    console.error("roteiro: falha na chamada à OpenRouter", e);
    return erro("Não consegui gerar o roteiro agora.", 502);
  }

  if (!response.ok) {
    const parsed = await response.json().catch(() => null);
    console.error("roteiro: OpenRouter respondeu", response.status, parsed?.error?.message);
    return erro(
      parsed?.error?.message || "Não consegui gerar o roteiro agora.",
      502,
    );
  }

  const payload = await response.json().catch(() => null);
  if (payload?.choices?.[0]?.finish_reason === "length")
    return erro("A resposta da IA veio cortada. Tente de novo.", 502);
  try {
    return Response.json(
      extractScriptJson(payload?.choices?.[0]?.message?.content ?? ""),
    );
  } catch (e) {
    console.error("roteiro: JSON inválido na resposta da IA", e);
    return erro((e as Error).message, 502);
  }
}
