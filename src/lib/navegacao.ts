/**
 * Para onde a área logada manda quem ficou sem sessão.
 * Se a sessão caiu sozinha, guarda a página para voltar depois do login.
 * Se a pessoa clicou em "Sair", vai limpo: senão a próxima conta cairia na página da anterior.
 */
export const destinoSemSessao = (pathname: string, saiu: boolean): string =>
  saiu ? "/entrar" : `/entrar?de=${encodeURIComponent(pathname)}`;

/** Menu lateral redimensionável: a largura original é o máximo; no mínimo, só os ícones. */
export const MENU_MAX = 272;
export const MENU_MIN = 76;
const MENU_COMPACTO_ABAIXO = 180;

/** Largura válida do menu (arrastada ou guardada no navegador); inválida volta ao máximo. */
export const larguraDoMenu = (valor: unknown): number => {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  return Number.isFinite(n) ? Math.round(Math.min(MENU_MAX, Math.max(MENU_MIN, n))) : MENU_MAX;
};

/** Estreito demais para os nomes: o menu mostra só os ícones. */
export const menuCompacto = (largura: number) => largura < MENU_COMPACTO_ABAIXO;
