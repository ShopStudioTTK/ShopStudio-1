import "server-only";
import { DOSSIE } from "@/lib/conhecimento/material";

export type ScriptInput = { produto: string; publico: string; beneficio: string; formato: string };

export type ScriptResult = {
  ganchos?: string[];
  problemas?: string[];
  solucoes?: string[];
  ctas?: string[];
  roteiro?: { gancho?: string; problema?: string; solucao?: string; cta?: string };
  hashtags?: string[];
  formatoSugerido?: string;
};

export const METHOD = `Método do guia Shop Studio (capítulo 10):
- Gancho (0 a 3 segundos): faz a pessoa parar de rolar. Tipos: curiosidade, quebra de padrão, visual, texto na tela em caixa alta. Nunca comece com "oi gente, vim mostrar".
- Problema (até 15 segundos): uma dor real que gera identificação, dita como quem conversa com uma amiga.
- Solução (até 45 segundos): a transformação que o produto entrega, nunca medidas, gramas ou embalagem.
- CTA (até 60 segundos): direciona a compra com escassez e urgência sem desespero, sempre citando o link da sacolinha.
- Duração ideal: 30 a 60 segundos.
- Tom: conselho de amiga, brasileiro, natural, sem parecer anúncio e sem promessas milagrosas.
- Formatos possíveis: conselho de amiga, tela verde, unboxing, storytelling, respondendo comentários, música viral.`;

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
  "formatoSugerido": "um dos formatos do guia, explicando em 1 frase como gravar"
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
  return SYSTEM_PROMPT + DOSSIE_BLOCK + trainingBlock + knowledgeBlock + FORMATO_FINAL;
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
