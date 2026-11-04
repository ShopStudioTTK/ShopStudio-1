import { autorizar, chamarOpenRouter, erro } from "@/lib/api-auth";
import { buildSystemPrompt, buildUserPrompt, extractScriptJson } from "@/lib/roteiro";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await autorizar(req, "roteiro", "Faça login para gerar roteiros.");
  if (auth instanceof Response) return auth;
  const { apiKey, model, supabase } = auth;

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
    response = await chamarOpenRouter(apiKey, {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(config ?? null, knowledge ?? []) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      stream: false,
      temperature: 0.8,
      max_tokens: 4000,
    });
  } catch (e) {
    console.error("roteiro: falha na chamada à OpenRouter", e);
    return erro("Não consegui gerar o roteiro agora.", 502);
  }

  if (!response.ok) {
    const parsed = await response.json().catch(() => null);
    console.error("roteiro: OpenRouter respondeu", response.status, parsed?.error?.message);
    return erro(parsed?.error?.message || "Não consegui gerar o roteiro agora.", 502);
  }

  const payload = await response.json().catch(() => null);
  if (payload?.choices?.[0]?.finish_reason === "length")
    return erro("A resposta da IA veio cortada. Tente de novo.", 502);
  try {
    return Response.json(extractScriptJson(payload?.choices?.[0]?.message?.content ?? ""));
  } catch (e) {
    console.error("roteiro: JSON inválido na resposta da IA", e);
    return erro((e as Error).message, 502);
  }
}
