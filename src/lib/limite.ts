// Usado no servidor (bloqueio) e na tela (aviso).
export const LIMITE_DIARIO = 15;
export const AVISO_A_PARTIR_DE = 12;

// ponytail: Brasília fixo em UTC-3 (sem horário de verão desde 2019); trocar por Intl se isso mudar.
const OFFSET_MS = 3 * 60 * 60 * 1000;

export const inicioDoDiaSP = (agora: Date = new Date()): Date => {
  const local = new Date(agora.getTime() - OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + OFFSET_MS);
};

export const mensagemDeLimite = (usadas: number): string | null => {
  if (usadas < AVISO_A_PARTIR_DE) return null;
  const restantes = LIMITE_DIARIO - usadas;
  if (restantes <= 0) return `Você usou as ${LIMITE_DIARIO} perguntas de hoje. Amanhã tem mais.`;
  return `Você ainda pode fazer ${restantes} ${restantes === 1 ? "pergunta" : "perguntas"} hoje.`;
};

// Gerador de roteiros: só bloqueio no servidor, sem aviso na tela.
export const LIMITE_ROTEIROS = 10;
export const MSG_LIMITE_ROTEIROS = `Você gerou os ${LIMITE_ROTEIROS} roteiros de hoje. Amanhã tem mais.`;
