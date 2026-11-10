import { autorizar, chamarOpenRouter, configDaIA, erro, liberarChamada, registrarCusto, reservarChamada } from "@/lib/api-auth";
import { LIMITE_ROTEIROS, MSG_LIMITE_ROTEIROS } from "@/lib/limite";
import { blocoDasFichas, buscarDoMesmoJeito, buscarParecidas, gatilhoDaIa, listarGatilhos } from "@/lib/fichas";
import type { Gatilho } from "@/lib/fichas-tipos";
import { buildSystemPrompt, buildUserPrompt, extractScriptJson } from "@/lib/roteiro";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await autorizar(req, "roteiro", "Faça login para gerar roteiros.");
  if (auth instanceof Response) return auth;
  const { apiKey, model, userId } = auth;

  const body = await req.json().catch(() => null);
  const field = (k: string) => String(body?.[k] ?? "").trim().slice(0, 500);
  const input = {
    produto: field("produto"),
    publico: field("publico"),
    beneficio: field("beneficio"),
    formato: field("formato"),
  };
  if (!input.produto) return erro("Diga qual é o produto.", 400);

  const reserva = await reservarChamada(
    userId, "roteiro", LIMITE_ROTEIROS, () => MSG_LIMITE_ROTEIROS, input.produto,
  );
  if (reserva instanceof Response) return reserva;
  const descontar = () => liberarChamada(reserva.id);

  // Opcionais: config, base, fichas da expert e gatilhos. Falha em qualquer um = roteiro como antes.
  const [{ config, knowledge }, parecidas, gatilhos] = await Promise.all([
    configDaIA(),
    buscarParecidas(input.produto),
    listarGatilhos().catch((e): Gatilho[] => {
      console.error("roteiro: falha ao ler os gatilhos", e);
      return [];
    }),
  ]);

  let response: Response;
  try {
    response = await chamarOpenRouter(apiKey, {
      model,
      messages: [
        { role: "system", content: buildSystemPrompt(config, knowledge, blocoDasFichas(parecidas, gatilhos)) },
        { role: "user", content: buildUserPrompt(input) },
      ],
      stream: false,
      temperature: 0.8,
      max_tokens: 4000,
    });
  } catch (e) {
    console.error("roteiro: falha na chamada à OpenRouter", e);
    await descontar();
    return erro("Não consegui gerar o roteiro agora.", 502);
  }

  if (!response.ok) {
    const parsed = await response.json().catch(() => null);
    console.error("roteiro: OpenRouter respondeu", response.status, parsed?.error?.message);
    await descontar();
    return erro(parsed?.error?.message || "Não consegui gerar o roteiro agora.", 502);
  }

  const payload = await response.json().catch(() => null);
  // A IA respondeu (mesmo que fora do formato): conta no limite e registra o custo.
  await registrarCusto(reserva.id, payload?.usage);
  if (payload?.choices?.[0]?.finish_reason === "length")
    return erro("A resposta da IA veio cortada. Tente de novo.", 502);
  try {
    const roteiro = extractScriptJson(payload?.choices?.[0]?.message?.content ?? "");
    const gatilho = gatilhoDaIa(roteiro.gatilho, gatilhos);
    const mesmoJeito = await buscarDoMesmoJeito(input.formato, gatilho, parecidas.map((f) => f.id)).catch((e) => {
      console.error("roteiro: falha ao buscar fichas do mesmo jeito", e);
      return [];
    });
    return Response.json({ ...roteiro, gatilho, fichas: { parecidas, mesmoJeito } });
  } catch (e) {
    console.error("roteiro: JSON inválido na resposta da IA", e);
    return erro((e as Error).message, 502);
  }
}
