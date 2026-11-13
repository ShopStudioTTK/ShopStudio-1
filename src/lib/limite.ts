// Usado no servidor (cobrança e bloqueio) e na tela (aviso).

// ponytail: Brasília fixo em UTC-3 (sem horário de verão desde 2019); trocar por Intl se isso mudar.
const OFFSET_MS = 3 * 60 * 60 * 1000;

export const inicioDoDiaSP = (agora: Date = new Date()): Date => {
  const local = new Date(agora.getTime() - OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + OFFSET_MS);
};

/**
 * Créditos semanais, um saldo por tipo, que não acumula: cada pedido gasta 1, do tamanho que for
 * (pedido da dona, 2026-11-12; antes era um saldo só de 40, com meio crédito a mais nos grandes).
 * Cada semana e cada tipo são uma linha nova em `creditos_semana`.
 */
export type TipoDeCredito = "assistente" | "roteiro";
export const LIMITE_SEMANAL: Record<TipoDeCredito, number> = { assistente: 15, roteiro: 7 };
/** O aviso na tela só aparece quando restam isto ou menos. */
export const AVISO_COM_RESTANTES: Record<TipoDeCredito, number> = { assistente: 4, roteiro: 2 };

/** A semana (domingo em que começou, à 0h de Brasília) como `AAAA-MM-DD`. */
export const semanaSP = (agora: Date = new Date()): string => {
  const local = new Date(agora.getTime() - OFFSET_MS);
  local.setUTCDate(local.getUTCDate() - local.getUTCDay());
  return local.toISOString().slice(0, 10);
};

/** Um pedido precisa de pelo menos 1 crédito do tipo dele. */
export const semCreditos = (restantes: number) => restantes < 1;

export const MSG_SEM_CREDITOS: Record<TipoDeCredito, string> = {
  assistente: `Suas ${LIMITE_SEMANAL.assistente} perguntas da semana acabaram. Domingo tem mais.`,
  roteiro: `Seus ${LIMITE_SEMANAL.roteiro} roteiros da semana acabaram. Domingo tem mais.`,
};

const NOME: Record<TipoDeCredito, [string, string]> = { assistente: ["pergunta", "perguntas"], roteiro: ["roteiro", "roteiros"] };

/**
 * `comprados`: créditos avulsos ainda válidos, gastos depois dos da semana. Com eles, o aviso conta o
 * total e não fala em domingo (os comprados não renovam).
 */
export const mensagemDeCreditos = (tipo: TipoDeCredito, restantes: number, comprados = 0): string | null => {
  const total = restantes + comprados;
  if (total > AVISO_COM_RESTANTES[tipo]) return null;
  if (semCreditos(total)) return MSG_SEM_CREDITOS[tipo];
  const [um, varios] = NOME[tipo];
  if (comprados > 0) {
    const contando = tipo === "assistente" ? "contando as compradas" : "contando os comprados";
    return total === 1 ? `Resta 1 ${um}, ${contando}.` : `Restam ${total} ${varios}, ${contando}.`;
  }
  return total === 1
    ? `Resta 1 ${um} nesta semana. Renova no domingo.`
    : `Restam ${total} ${varios} nesta semana. Renova no domingo.`;
};

/**
 * Créditos avulsos (pedido da dona, 2026-11-12): valem 30 dias a partir da compra (`vale_ate` em
 * `creditos_comprados`), são gastos depois dos da semana e ficam separados por tipo. A compra ainda
 * não existe: os pacotes só aparecem na página Créditos (/app/creditos).
 */
/** Valor unitário de cada tipo; o "de" dos combos sai daqui. */
export const PRECO_AVULSO: Record<TipoDeCredito, number> = { assistente: 0.7, roteiro: 1.6 };

export type Quantidades = Record<TipoDeCredito, number>;
/** Saldo da aluna (`GET /api/creditos`). `vencimento`: o lote comprado que vence primeiro (ISO). */
export type Saldo = { restantes: Quantidades; comprados: Quantidades; vencimento: string | null };
export type Pacote = Quantidades & { id: string; nome: string; preco: number; selo?: string };
// ponytail: pacotes fixos porque cada um vira um produto na plataforma de venda; trocar à vontade.
// Na ordem da vitrine: os combos primeiro (é o que a dona quer vender), roteiros antes de perguntas.
export const PACOTES: Pacote[] = [
  { id: "combo-pro", nome: "Combo Pro", assistente: 10, roteiro: 20, preco: 29.9, selo: "Melhor custo-benefício" },
  { id: "combo-criador", nome: "Combo Criador", assistente: 5, roteiro: 10, preco: 17.9, selo: "Mais vendido" },
  { id: "roteiros-5", nome: "Roteiros", assistente: 0, roteiro: 5, preco: 8 },
  { id: "perguntas-10", nome: "Perguntas", assistente: 10, roteiro: 0, preco: 7 },
];

/** `cheio` = o mesmo pacote pelo valor unitário (o "de"), em centavos inteiros para não errar no arredondamento. */
export const precoDoPacote = (p: Pacote): { cheio: number; preco: number } => ({
  cheio: Math.round(p.assistente * PRECO_AVULSO.assistente * 100 + p.roteiro * PRECO_AVULSO.roteiro * 100) / 100,
  preco: p.preco,
});

export const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
