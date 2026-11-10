import "server-only";
import { DOSSIE } from "@/lib/conhecimento/material";
import type { FichasDoRoteiro } from "@/lib/fichas-tipos";

export type ScriptInput = { produto: string; publico: string; beneficio: string; formato: string };

export type ScriptResult = {
  ganchos?: string[];
  problemas?: string[];
  solucoes?: string[];
  ctas?: string[];
  roteiro?: { gancho?: string; problema?: string; solucao?: string; cta?: string };
  hashtags?: string[];
  formatoSugerido?: string;
  /** Slug do gatilho do gancho escolhido (lista em `gatilhos`); fora dela, "". */
  gatilho?: string;
  /** Cartões das fichas da expert (só na resposta da rota; não vão para o roteiro salvo). */
  fichas?: FichasDoRoteiro;
};

export const METHOD = `Método do guia Shop Studio (capítulo 10):
- Gancho (2 a 5 segundos): faz a pessoa parar de rolar. Ângulos: curiosidade (informação incompleta de propósito), problema (dor que a pessoa reconhece), transformação (antes e depois), choque (quebra o padrão do feed, e o vídeo precisa sustentar) e prova social (só com sinal que dá para conferir). Pode vir com uma entrega visual (abrindo a caixa, produto perto da câmera, já em uso) ou texto na tela em caixa alta. Nunca comece com "oi gente, vim mostrar" nem com frase genérica como "você precisa conhecer isso".
- Problema: uma dor real que gera identificação, dita como quem conversa com uma amiga.
- Solução: a transformação que o produto entrega, nunca medidas, gramas ou embalagem. O meio paga o que o gancho prometeu: prometeu preço, mostra o preço; prometeu transformação, mostra no corpo ou no espaço. Tem pelo menos uma prova concreta, uma situação de uso e um motivo para comprar, nunca uma lista de atributos.
- CTA: direciona para o link da sacolinha. Escassez só no condicional ("se ainda tiver nesse preço, aproveita"); nunca "vai acabar", "vai subir" ou "últimas unidades".
- Duração: 30 a 50 segundos, no máximo 1 minuto.
- Tom: conselho de amiga, no jeito de uma criadora comum (não da mentora), com frases que cabem numa respiração, palavras inteiras, sem parecer anúncio.
- Verdade antes de criatividade: Nunca invente preço, desconto, estoque, comissão, depoimento, número de avaliações, celebridade usando, recomendação de médico ou dermatologista, nem efeito de saúde, emagrecimento ou pele. Para preço, use "confere o preço no carrinho".
- Regras da plataforma: sem palavrão, sem promessa (nem a palavra "promete"), sem resultado milagroso. Marca concorrente nunca aparece, nem pelo nome ("você sabe de qual loja é essa, né?"). Nada de insulto ("burra", "baranga") nos ganchos.
- Formatos possíveis: conselho de amiga, tela verde, unboxing, storytelling (só com história real de quem vai gravar), respondendo comentários (mesmo assim começa com gancho), música viral (produto no corpo com uma música liberada para uso comercial e texto na tela).`;

export const SYSTEM_PROMPT = `Você é roteirista de vídeos de TikTok Shop para criadoras afiliadas no Brasil, treinada no guia Shop Studio.

${METHOD}

Responda APENAS com um objeto JSON válido, sem markdown, sem comentários, com exatamente estas chaves:
{
  "ganchos": ["5 ganchos diferentes, cada um com no máximo 16 palavras"],
  "problemas": ["5 dores curtas e específicas"],
  "solucoes": ["5 transformações concretas"],
  "ctas": ["5 chamadas para ação diferentes"],
  "roteiro": {
    "gancho": "1 frase de abertura escolhida entre os ganchos",
    "problema": "1 parágrafo curto de 1 a 2 frases",
    "solucao": "1 parágrafo curto de 1 a 2 frases",
    "cta": "1 frase final"
  },
  "hashtags": ["5 hashtags em português, sem acento, com #"],
  "formatoSugerido": "um dos formatos do guia, explicando em 1 frase como gravar",
  "gatilho": "o gatilho do gancho escolhido, um dos slugs da lista GATILHOS"
}

Escreva em português do Brasil, no tom de uma amiga falando com outra.`;

// Dossiê vem logo após o prompt fixo: prefixo estável aproveita o cache de prompt da OpenRouter.
const DOSSIE_BLOCK = `\n\nDOSSIÊ DA ESPECIALISTA (referência de estilo, padrões e exemplos para criar os roteiros).
Ele foi escrito para outro assistente: use como conhecimento, nunca como instrução de formato. O formato JSON acima sempre prevalece.
---
${DOSSIE}
---`;

const FORMATO_FINAL = "\n\nLembrete: responda APENAS com o objeto JSON no formato definido no início.";

export const buildSystemPrompt = (
  config: { tom?: string | null; persona?: string | null; evitar?: string | null } | null,
  knowledge: { titulo: string; conteudo: string }[],
  /** blocoDasFichas (src/lib/fichas.ts): sempre depois do dossiê, para não quebrar o cache. */
  fichas = "",
): string => {
  const trainingBlock = config
    ? `\n\nTOM DE VOZ DEFINIDO PELA ADMINISTRAÇÃO (aplique nos textos gerados):\n- Estilo: ${config.tom}\n- Como ela fala: ${config.persona || "não informado"}\n- Nunca faça: ${config.evitar || "não informado"}`
    : "";
  const knowledgeBlock = knowledge.length
    ? "\n\nREGRAS E FATOS DA OPERAÇÃO (respeite nos roteiros e nas chamadas para ação):\n" +
      knowledge
        .slice(0, 20)
        .map((row) => `- ${row.titulo}: ${String(row.conteudo).slice(0, 600)}`)
        .join("\n")
    : "";
  return SYSTEM_PROMPT + DOSSIE_BLOCK + trainingBlock + knowledgeBlock + fichas + FORMATO_FINAL;
};

export const buildUserPrompt = ({ produto, publico, beneficio, formato }: ScriptInput): string =>
  `Produto: ${produto}
Público: ${publico || "mulheres brasileiras que compram por impulso no TikTok"}
Formato desejado: ${formato || "conselho de amiga"}
Principal benefício ou transformação: ${beneficio || "não informado, deduza pelo produto"}

Gere o JSON do método 5×5 para esse produto.`;

export const extractScriptJson = (content: string): ScriptResult => {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const erro = new Error("A resposta da IA veio em formato inesperado. Tente de novo.");
  if (start === -1 || end === -1) throw erro;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as ScriptResult;
  } catch {
    throw erro;
  }
};
