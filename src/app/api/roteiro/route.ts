import { after } from "next/server";
import {
  autorizar,
  chamarOpenRouter,
  devolverCredito,
  ehAdmin,
  erro,
  guardarResultado,
  liberarChamada,
  registrarCusto,
  reservarChamada,
} from "@/lib/api-auth";
import { blocoDasFichas, buscarDoMesmoJeito, buscarParecidas, gatilhoDaIa, listarExemplosFixos, listarGatilhos } from "@/lib/fichas";
import type { FichaCartao, Gatilho } from "@/lib/fichas-tipos";
import { uuid } from "@/lib/entrada";
import { buildSystemPrompt, buildUserPrompt, extractScriptJson, RASCUNHO_BLOCK } from "@/lib/roteiro";

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
    preco: field("preco").slice(0, 40).trim(),
  };
  if (!input.produto) return erro("Diga qual é o produto.", 400);

  // Admin (conferida no banco a cada chamada): sem créditos, e o rascunho da ficha leva porquê e entonação.
  // A falha na leitura de admins = segue como aluna.
  const adm = await ehAdmin(userId).catch((e) => {
    console.error("roteiro: falha ao ler admins", e);
    return false;
  });
  const rascunho = adm && body?.rascunho === true;

  // Id do navegador para retomar depois do F5 (GET /api/pedidos). Só vale junto com o userId do token.
  const pedido = uuid(body?.pedido);
  const reserva = await reservarChamada(userId, "roteiro", adm, input.produto, null, pedido);
  if (reserva instanceof Response) return reserva;
  const descontar = () => liberarChamada(reserva);
  // Depois que a IA respondeu, o que a aluna recebe fica guardado (com pedido) para ela retomar.
  const responder = async (corpo: unknown, status = 200) => {
    if (pedido) await guardarResultado(reserva.id, status, corpo);
    return Response.json(corpo, { status });
  };

  // Vai até o fim mesmo se a aluna sair ou der F5: o crédito já foi reservado e o resultado fica guardado.
  const trabalho = (async () => {
    // Opcionais: fichas da expert (parecidas e fixas) e gatilhos. Falha em qualquer um = roteiro como antes.
    const [parecidas, gatilhos, fixas] = await Promise.all([
      buscarParecidas(input.produto),
      listarGatilhos().catch((e): Gatilho[] => {
        console.error("roteiro: falha ao ler os gatilhos", e);
        return [];
      }),
      listarExemplosFixos().catch((e): FichaCartao[] => {
        console.error("roteiro: falha ao ler os exemplos fixos", e);
        return [];
      }),
    ]);

    let response: Response;
    try {
      response = await chamarOpenRouter(apiKey, {
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(blocoDasFichas(parecidas, gatilhos, fixas) + (rascunho ? RASCUNHO_BLOCK : "")) },
          { role: "user", content: buildUserPrompt(input) },
        ],
        stream: false,
        temperature: 0.8,
        max_tokens: 4000,
        reasoning: { enabled: false },
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
    // A IA respondeu: o custo fica registrado. Mas o crédito só é gasto se a aluna recebe o roteiro.
    await registrarCusto(reserva.id, payload?.usage);
    if (payload?.choices?.[0]?.finish_reason === "length") {
      await devolverCredito(reserva);
      return responder({ error: { message: "A resposta da IA veio cortada. Tente de novo." } }, 502);
    }
    let roteiro: ReturnType<typeof extractScriptJson>;
    try {
      roteiro = extractScriptJson(payload?.choices?.[0]?.message?.content ?? "");
    } catch (e) {
      console.error("roteiro: JSON inválido na resposta da IA", e);
      await devolverCredito(reserva);
      return responder({ error: { message: (e as Error).message } }, 502);
    }
    const gatilho = gatilhoDaIa(roteiro.gatilho, gatilhos);
    const mesmoJeito = await buscarDoMesmoJeito(input.formato, gatilho, parecidas.map((f) => f.id)).catch((e) => {
      console.error("roteiro: falha ao buscar fichas do mesmo jeito", e);
      return [];
    });
    return responder({ ...roteiro, gatilho, fichas: { parecidas, mesmoJeito } });
  })();
  after(trabalho);
  return trabalho;
}
