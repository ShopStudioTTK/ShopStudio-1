import "server-only";

/** 1536 = openai/text-embedding-3-small, acoplado à coluna `treinamento.embedding`. */
export const DIMENSOES = 1536;

/**
 * Embedding pela OpenRouter. Lança em qualquer falha (sem chave, erro, timeout, tamanho errado):
 * quem chama decide seguir sem ele.
 * Trocar OPENROUTER_EMBEDDING_MODEL exige outro tamanho de coluna e indexar tudo de novo.
 */
export async function gerarEmbedding(texto: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada.");
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Title": "Shop Studio" },
    body: JSON.stringify({ model: process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small", input: texto }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`embedding: OpenRouter respondeu ${res.status}`);
  const vetor = (await res.json())?.data?.[0]?.embedding;
  if (!Array.isArray(vetor) || vetor.length !== DIMENSOES) throw new Error("embedding: vetor inválido");
  return vetor;
}
