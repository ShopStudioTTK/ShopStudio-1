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

export const mensagemDeCreditos = (tipo: TipoDeCredito, restantes: number): string | null => {
  if (restantes > AVISO_COM_RESTANTES[tipo]) return null;
  if (semCreditos(restantes)) return MSG_SEM_CREDITOS[tipo];
  const [um, varios] = NOME[tipo];
  return restantes === 1
    ? `Resta 1 ${um} nesta semana. Renova no domingo.`
    : `Restam ${restantes} ${varios} nesta semana. Renova no domingo.`;
};

/** Cartão perto do botão (pedido da dona, 2026-11-12): quanto a ação gasta e quanto ainda resta. */
export const usoPorAcao = (tipo: TipoDeCredito) => `Cada ${NOME[tipo][0]} usa 1 crédito.`;
export const saldoDeCreditos = (restantes: number) =>
  `Você ainda tem ${restantes} ${restantes === 1 ? "crédito" : "créditos"} nesta semana.`;
