import { getChapter } from "@/content/chapters";
import {
  autenticar,
  autorizar,
  chamadasDeHoje,
  chamarOpenRouter,
  configDaIA,
  erro,
  liberarChamada,
  registrarCusto,
  reservarChamada,
} from "@/lib/api-auth";
import { buildAssistantSystemPrompt, sanitizeMessages } from "@/lib/assistente";
import { uuid } from "@/lib/entrada";
import { LIMITE_DIARIO, mensagemDeLimite } from "@/lib/limite";
import { blocoDaExpert, consultarExpert, registrarNaFila } from "@/lib/treinamento";
import { comRegistroDeUso } from "@/lib/uso";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await autorizar(req, "assistente", "Faça login para usar o assistente.");
  if (auth instanceof Response) return auth;
  const { apiKey, model, userId } = auth;

  const body = await req.json().catch(() => null);
  const turns = sanitizeMessages(body?.messages);
  if (!turns.length) return erro("Escreva sua dúvida.", 400);
  // Só o slug vem do navegador; o título sai do conteúdo. Texto livre aqui entraria no prompt de sistema.
  const chapterTitle = typeof body?.capitulo === "string" ? getChapter(body.capitulo)?.title : undefined;
  // Id da conversa gerado pelo navegador; só vale junto com o userId do token (ver registrarNaFila).
  const conversa = uuid(body?.conversa);
  const perguntas = turns.filter((t) => t.role === "user").map((t) => t.content);
  const pergunta = perguntas.at(-1)!;
  const anteriores = perguntas.slice(0, -1);

  const reserva = await reservarChamada(
    userId, "assistente", LIMITE_DIARIO, (usadas) => mensagemDeLimite(usadas)!,
    turns.at(-1)!.content, chapterTitle ?? null,
  );
  if (reserva instanceof Response) return reserva;
  const descontar = () => liberarChamada(reserva.id);

  // persona, base de conhecimento e respostas da expert são opcionais
  const [{ config, knowledge }, expert] = await Promise.all([configDaIA(), consultarExpert(anteriores, pergunta)]);
  // Preset da OpenRouter com a voz da especialista, só no assistente (o roteiro devolve JSON).
  // Só funciona no nome do modelo: o campo `preset` do corpo é ignorado. Com ele, a persona do ai_config sai.
  const preset = process.env.OPENROUTER_PRESET;

  let response: Response;
  try {
    response = await chamarOpenRouter(apiKey, {
      model: preset ? `${model}@preset/${preset}` : model,
      messages: [
        { role: "system", content: buildAssistantSystemPrompt(preset ? null : config, knowledge, chapterTitle, blocoDaExpert(expert.respostas)) },
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

  const corpo = comRegistroDeUso(response.body, async (uso, fim) => {
    await registrarCusto(reserva.id, uso);
    // A conversa vai para a fila de treinamento da expert. Só resposta completa ("stop"): cortada,
    // com erro ou interrompida não entra, para meia resposta nunca ser aprovada como exemplo.
    if (!conversa || !fim.texto.trim() || fim.finishReason !== "stop") return;
    await registrarNaFila({ userId, conversa, contexto: anteriores, pergunta, respostaIa: fim.texto, vetor: expert.vetor })
      .catch((e) => console.error("assistente: falha ao gravar na fila de treinamento", e));
  });

  return new Response(corpo, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Perguntas-Restantes": String(LIMITE_DIARIO - reserva.usadas - 1),
    },
  });
}

/** Quantas perguntas a aluna já fez hoje (para o aviso de limite na tela). */
export async function GET(req: Request) {
  const auth = await autenticar(req, "assistente", "Faça login para usar o assistente.");
  if (auth instanceof Response) return auth;
  return Response.json({ usadas: await chamadasDeHoje(auth.userId, "assistente") });
}
