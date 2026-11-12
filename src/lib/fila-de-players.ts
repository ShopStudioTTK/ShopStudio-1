/**
 * Fila que libera os players do TikTok um de cada vez.
 *
 * Com vários cartões na tela (Campeões, mural), montar todos os iframes juntos faz o TikTok
 * responder 429 (Too Many Requests) e o cartão mostra a página de erro dele. A fila espaça
 * as cargas: o primeiro sai na hora, os outros a cada `intervaloMs`.
 *
 * Quem pediu e não precisa mais (o cartão saiu da tela ou desmontou) chama o cancelar que
 * `pedir` devolve, e a vaga passa para o próximo.
 */

export const INTERVALO_ENTRE_PLAYERS_MS = 1000;

type Relogio = {
  agora: () => number;
  agendar: (fn: () => void, ms: number) => unknown;
};

// Resolvidos na hora da chamada, para os timers falsos dos testes valerem.
const relogioPadrao: Relogio = {
  agora: () => Date.now(),
  agendar: (fn, ms) => setTimeout(fn, ms),
};

export const criarFila = (intervaloMs: number, relogio: Relogio = relogioPadrao) => {
  const espera: { liberar: () => void }[] = [];
  let ultimaLiberacao = -Infinity;
  let agendado = false;

  const andar = () => {
    agendado = false;
    const proximo = espera.shift();
    if (!proximo) return;
    ultimaLiberacao = relogio.agora();
    proximo.liberar();
    if (espera.length > 0) {
      agendado = true;
      relogio.agendar(andar, intervaloMs);
    }
  };

  /** Entra na fila. `liberar` é chamado quando chegar a vez. Devolve a função que sai da fila. */
  const pedir = (liberar: () => void) => {
    const item = { liberar };
    espera.push(item);
    if (!agendado) {
      const falta = ultimaLiberacao + intervaloMs - relogio.agora();
      if (falta <= 0) {
        andar();
      } else {
        agendado = true;
        relogio.agendar(andar, falta);
      }
    }
    return () => {
      const i = espera.indexOf(item);
      if (i >= 0) espera.splice(i, 1);
    };
  };

  return { pedir };
};
