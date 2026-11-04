import { autorizar, chamarOpenRouter, erro } from "@/lib/api-auth";
import { buildAssistantSystemPrompt, sanitizeMessages } from "@/lib/assistente";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await autorizar(req, "assistente", "Faça login para usar o assistente.");
  if (auth instanceof Response) return auth;
  const { apiKey, model, supabase } = auth;

  const body = await req.json().catch(() => null);
  const turns = sanitizeMessages(body?.messages);
  if (!turns.length) return erro("Escreva sua dúvida.", 400);
  const chapterTitle = typeof body?.chapterTitle === "string" ? body.chapterTitle.slice(0, 200) : undefined;

  // persona e base de conhecimento são opcionais
  const { data: config } = await supabase
    .from("ai_config")
    .select("nome, tom, persona, evitar, exemplos")
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
        { role: "system", content: buildAssistantSystemPrompt(config ?? null, knowledge ?? [], chapterTitle) },
        ...turns,
      ],
      stream: true,
      temperature: 0.6,
      // modelos com raciocínio gastam parte disso pensando
      max_tokens: 4000,
    });
  } catch (e) {
    console.error("assistente: falha na chamada à OpenRouter", e);
    return erro("Não consegui responder agora. Tente de novo.", 502);
  }

  if (!response.ok || !response.body) {
    const parsed = await response.json().catch(() => null);
    console.error("assistente: OpenRouter respondeu", response.status, parsed?.error?.message);
    return erro(parsed?.error?.message || "Não consegui responder agora. Tente de novo.", 502);
  }

  return new Response(response.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
