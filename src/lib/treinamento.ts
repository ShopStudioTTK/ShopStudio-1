import "server-only";
import { db } from "@/lib/db";
import { gerarEmbedding } from "@/lib/embedding";

/**
 * Semelhança (1 - distância de cosseno) entre a pergunta e as já respondidas pela expert.
 * Valores de partida; dependem do modelo de embedding. Calibrar com perguntas reais (ver DEVLOG).
 */
export const LIMIAR_QUASE_IGUAL = 0.9; // a IA repete a resposta dela quase palavra por palavra
export const LIMIAR_EXEMPLO = 0.7; // entra no prompt como modelo de tom e conteúdo
export const LIMIAR_PARECIDA = 0.6; // só a ligação na tela de treinamento
export const MAX_EXEMPLOS = 4;
export const MAX_CONTEXTO = 2;

/**
 * Texto que vira embedding: a pergunta com as anteriores da mesma conversa, para uma pergunta
 * solta ("e quanto tempo demora?") saber do que fala. O mesmo formato vale ao indexar e ao buscar.
 */
export const textoParaEmbedding = (contexto: string[], pergunta: string): string => {
  const anteriores = contexto.slice(-MAX_CONTEXTO);
  if (!anteriores.length) return pergunta;
  return `Perguntas anteriores:\n${anteriores.map((p) => `- ${p}`).join("\n")}\nPergunta: ${pergunta}`;
};

/** Formato que o pgvector lê; vai sempre como parâmetro, com `::extensions.vector`. */
export const vetorSql = (v: number[]): string => JSON.stringify(v);

export type RespostaDaExpert = { pergunta: string; resposta: string; similaridade: number };

export async function buscarRespostasDaExpert(vetor: number[]): Promise<RespostaDaExpert[]> {
  const v = vetorSql(vetor);
  const linhas = await db()`
    select pergunta, resposta, 1 - (embedding <=> ${v}::extensions.vector) as similaridade
    from public.treinamento
    where status = 'respondida' and embedding is not null
    order by embedding <=> ${v}::extensions.vector
    limit ${MAX_EXEMPLOS}`;
  return linhas.map((l) => ({ pergunta: l.pergunta, resposta: l.resposta, similaridade: Number(l.similaridade) }));
}

const par = (r: RespostaDaExpert) => `Pergunta: ${r.pergunta}\nResposta da especialista: ${r.resposta}`;

/** Bloco que vai no FIM do system prompt (depois do material, para não quebrar o cache). */
export const blocoDaExpert = (respostas: RespostaDaExpert[]): string => {
  const [melhor] = respostas;
  if (melhor && melhor.similaridade >= LIMIAR_QUASE_IGUAL) {
    return `A ESPECIALISTA JÁ RESPONDEU ESTA PERGUNTA. Responda com a resposta dela, praticamente palavra por palavra. Só pode ligar com o que a aluna disse na conversa ou acrescentar um detalhe curto do material, sem contrariar a resposta. A citação (Aula N, m:ss) continua obrigatória quando a informação vier da transcrição.\n\n${par(melhor)}`;
  }
  const parecidas = respostas.filter((r) => r.similaridade >= LIMIAR_EXEMPLO);
  if (!parecidas.length) return "";
  return `RESPOSTAS DA ESPECIALISTA A PERGUNTAS PARECIDAS — imite o tom, as gírias, o jeito de falar e o tamanho. Use o conteúdo quando for a mesma dúvida; as regras de conteúdo acima continuam valendo, e a citação (Aula N, m:ss) continua obrigatória quando a informação vier da transcrição.\n\n${parecidas.map(par).join("\n\n")}`;
};

/**
 * Embedding da pergunta da aluna (com as anteriores da conversa) e as respostas da expert mais
 * parecidas. Nunca lança: qualquer falha = assistente sem respostas da expert, como antes.
 */
export async function consultarExpert(
  contexto: string[],
  pergunta: string,
): Promise<{ vetor: number[] | null; respostas: RespostaDaExpert[] }> {
  let vetor: number[] | null = null;
  try {
    vetor = await gerarEmbedding(textoParaEmbedding(contexto, pergunta));
    return { vetor, respostas: await buscarRespostasDaExpert(vetor) };
  } catch (e) {
    console.error("assistente: falha ao buscar respostas da expert", e);
    return { vetor, respostas: [] };
  }
}

/**
 * Grava a pergunta da aluna na conversa dela da fila de treinamento. A conversa é sempre o par
 * (user_id do token, id do navegador): uma aluna nunca escreve na conversa de outra. A linha do
 * treinamento não leva user_id. Lança em erro (quem chama só loga).
 * ponytail: contexto guardado com "\n" entre as perguntas; pergunta com quebra de linha vira duas no embedding refeito.
 */
export async function registrarNaFila(p: {
  userId: string;
  conversa: string;
  contexto: string[];
  pergunta: string;
  respostaIa: string;
  vetor: number[] | null;
}): Promise<void> {
  const contexto = p.contexto.slice(-MAX_CONTEXTO).join("\n") || null;
  const v = p.vetor ? vetorSql(p.vetor) : null;
  await db()`
    with c as (
      insert into public.treinamento_conversas (user_id, conversa_cliente) values (${p.userId}, ${p.conversa})
      on conflict (user_id, conversa_cliente) do update set conversa_cliente = excluded.conversa_cliente
      returning id
    )
    insert into public.treinamento (origem, conversa_id, ordem, contexto, pergunta, resposta_ia, embedding)
    select 'aluna', c.id, coalesce((select max(ordem) from public.treinamento where conversa_id = c.id), 0) + 1,
      ${contexto}, ${p.pergunta.slice(0, 1000)}, ${p.respostaIa}, ${v}::extensions.vector
    from c`;
}
