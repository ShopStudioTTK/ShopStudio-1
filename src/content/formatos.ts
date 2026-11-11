/** Formatos de vídeo do gerador (capítulo 10). Sem segredo: são só rótulos da tela. */
export const FORMATOS = [
  { id: "Conselho de amiga", emoji: "💬", dica: "Fala direto pra câmera, como pra uma amiga" },
  { id: "Unboxing", emoji: "📦", dica: "Abre, mostra e reage na hora" },
  { id: "Tela verde", emoji: "🟩", dica: "Você na frente do print ou da foto" },
  { id: "Storytelling", emoji: "📖", dica: "Uma história verdadeira com o produto" },
  { id: "Música viral", emoji: "🎵", dica: "Som em alta + texto na tela" },
] as const;

export type Formato = (typeof FORMATOS)[number]["id"];

export const FORMATO_PADRAO: Formato = FORMATOS[0].id;

export const ehFormato = (valor: string | null | undefined): valor is Formato =>
  FORMATOS.some((f) => f.id === valor);

/** Ideias para quem abre o Studio sem saber por onde começar. */
export const SUGESTOES_DE_PRODUTO = [
  "Legging cintura alta",
  "Sérum de vitamina C",
  "Organizador de gaveta",
  "Escova secadora",
  "Kit de enxoval",
];

type Duracao = { total: string; etapas: Record<"gancho" | "problema" | "solucao" | "cta", string> };
const FALADO: Duracao = { total: "30 a 60s", etapas: { gancho: "0–3s", problema: "até 15s", solucao: "até 45s", cta: "até 60s" } };
const MUSICA: Duracao = { total: "7 a 15s · sem fala", etapas: { gancho: "0–2s", problema: "até 5s", solucao: "até 12s", cta: "até 15s" } };

/** Duração do roteiro e de cada parte, pelo formato (a Música viral é curta e sem fala). */
export const duracaoDoFormato = (formato: string): Duracao => (formato === "Música viral" ? MUSICA : FALADO);
