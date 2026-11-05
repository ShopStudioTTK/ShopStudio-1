import { getChapter } from "@/content/chapters";
import { autorizar, chamarOpenRouter, erro } from "@/lib/api-auth";
import { buildAssistantSystemPrompt, sanitizeMessages } from "@/lib/assistente";
import { inicioDoDiaSP, LIMITE_DIARIO, mensagemDeLimite } from "@/lib/limite";
import { comRegistroDeUso } from "@/lib/uso";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await autorizar(req, "assistente", "Faça login para usar o assistente.");
  if (auth instanceof Response) return auth;
  const { apiKey, model, supabase, userId } = auth;

  const body = await req.json().catch(() => null);
  const turns = sanitizeMessages(body?.messages);
  if (!turns.length) return erro("Escreva sua dúvida.", 400);
  // Só o slug vem do navegador; o título sai do conteúdo. Texto livre aqui entraria no prompt de sistema.
  const chapterTitle = typeof body?.capitulo === "string" ? getChapter(body.capitulo)?.title : undefined;

  // ponytail: contar e gravar não é atômico; duas abas ao mesmo tempo podem passar 1 pergunta do limite.
  const { count, error: countError } = await supabase
    .from("ai_perguntas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", inicioDoDiaSP().toISOString());
  if (countError) {
    console.error("assistente: falha ao contar perguntas", countError);
    return erro("Não consegui verificar seu limite agora.", 500);
  }
  const usadas = count ?? 0;
  if (usadas >= LIMITE_DIARIO) return erro(mensagemDeLimite(usadas)!, 429);

  const { data: registro, error: insertError } = await supabase
    .from("ai_perguntas")
    .insert({ user_id: userId, pergunta: turns.at(-1)!.content, capitulo: chapterTitle ?? null })
    .select("id")
    .single();
  if (insertError || !registro) {
    console.error("assistente: falha ao gravar pergunta", insertError);
    return erro("Não consegui registrar sua pergunta agora.", 500);
  }
  // Pergunta que a IA não respondeu não conta no limite.
  const descontar = () => supabase.from("ai_perguntas").delete().eq("id", registro.id);

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
      usage: { include: true },
      temperature: 0.6,
      // modelos com raciocínio gastam parte disso pensando
      max_tokens: 4000,
    });
  } catch (e) {
    console.error("assistente: falha na chamada à OpenRouter", e);
    await descontar();
    return erro("Não consegui responder agora. Tente de novo.", 502);
  }

  if (!response.ok || !response.body) {
    const parsed = await response.json().catch(() => null);
    console.error("assistente: OpenRouter respondeu", response.status, parsed?.error?.message);
    await descontar();
    return erro(parsed?.error?.message || "Não consegui responder agora. Tente de novo.", 502);
  }

  const corpo = comRegistroDeUso(response.body, async (uso) => {
    if (!uso) return;
    const { error } = await supabase
      .from("ai_perguntas")
      .update({
        tokens_entrada: uso.prompt_tokens,
        tokens_saida: uso.completion_tokens,
        tokens_cache: uso.prompt_tokens_details?.cached_tokens,
        custo_usd: uso.cost,
      })
      .eq("id", registro.id);
    if (error) console.error("assistente: falha ao gravar custo", error);
  });

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Perguntas-Restantes": String(LIMITE_DIARIO - usadas - 1),
    },
  });
}
