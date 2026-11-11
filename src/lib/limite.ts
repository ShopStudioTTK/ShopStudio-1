// Usado no servidor (cobrança e bloqueio) e na tela (aviso).

// ponytail: Brasília fixo em UTC-3 (sem horário de verão desde 2019); trocar por Intl se isso mudar.
const OFFSET_MS = 3 * 60 * 60 * 1000;

export const inicioDoDiaSP = (agora: Date = new Date()): Date => {
  const local = new Date(agora.getTime() - OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + OFFSET_MS);
};

/** Créditos semanais: não acumulam. Cada semana é uma linha nova em `creditos_semana`. */
export const CREDITOS_POR_SEMANA = 40;
/** O aviso na tela só aparece quando restam isto ou menos. */
export const AVISO_COM_RESTANTES = 10;

/** A semana (domingo em que começou, à 0h de Brasília) como `AAAA-MM-DD`. */
export const semanaSP = (agora: Date = new Date()): string => {
  const local = new Date(agora.getTime() - OFFSET_MS);
  local.setUTCDate(local.getUTCDate() - local.getUTCDay());
  return local.toISOString().slice(0, 10);
};

/**
 * Preço pelos tokens de saída (o que a IA escreveu + o raciocínio): o material é igual para todas e
 * fica em cache. 1 crédito até `base`, +0,5 a cada `passo` a mais, até `TETO`.
 * ponytail: calibrado com 9 perguntas e 11 roteiros (2026-11-11); recalibrar com uso real.
 */
const PRECO = { assistente: { base: 600, passo: 600 }, roteiro: { base: 2000, passo: 1000 } } as const;
const TETO = 2;

export const precoEmCreditos = (rota: keyof typeof PRECO, tokensSaida: number | null | undefined): number => {
  const { base, passo } = PRECO[rota];
  const extra = Math.max(0, Math.ceil(((tokensSaida ?? 0) - base) / passo)) * 0.5;
  return Math.min(TETO, 1 + extra);
};

/** Uma pergunta ou roteiro precisa de pelo menos 1 crédito para começar. */
export const semCreditos = (restantes: number) => restantes < 1;

export const MSG_SEM_CREDITOS = "Seus créditos da semana acabaram. Domingo tem mais.";

export const mensagemDeCreditos = (restantes: number): string | null => {
  if (restantes > AVISO_COM_RESTANTES) return null;
  if (semCreditos(restantes)) return MSG_SEM_CREDITOS;
  const n = restantes.toLocaleString("pt-BR");
  return restantes < 2
    ? `Resta ${n} crédito nesta semana. Renova no domingo.`
    : `Restam ${n} créditos nesta semana. Renova no domingo.`;
};
