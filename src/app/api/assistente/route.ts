import { getChapter } from "@/content/chapters";
import { autorizar, chamarOpenRouter, erro, liberarChamada, registrarCusto, reservarChamada } from "@/lib/api-auth";
import { buildAssistantSystemPrompt, sanitizeMessages } from "@/lib/assistente";
import { LIMITE_DIARIO, mensagemDeLimite } from "@/lib/limite";
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

  const reserva = await reservarChamada(
    supabase, userId, "assistente", LIMITE_DIARIO, (usadas) => mensagemDeLimite(usadas)!,
    turns.at(-1)!.content, chapterTitle ?? null,
  );
  if (reserva instanceof Response) return reserva;
  const descontar = () => liberarChamada(supabase, reserva.id);

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

  const corpo = comRegistroDeUso(response.body, (uso) => registrarCusto(supabase, reserva.id, uso));

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Perguntas-Restantes": String(LIMITE_DIARIO - reserva.usadas - 1),
    },
  });
}
