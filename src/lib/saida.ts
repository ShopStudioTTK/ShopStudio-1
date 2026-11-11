// Guarda de saída: com um roteiro gerado e não salvo, sair da tela pergunta antes.

type Clique = Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented">;
type Link = { href: string; target: string; download: boolean };

/**
 * Se o clique num link leva para outra página do app, devolve o destino (caminho + query + âncora).
 * Nova aba, botão do meio, teclas, download, outro site, mesma página ou clique já cancelado: null
 * (o navegador ou outro código cuida).
 */
export function destinoDoClique(e: Clique, link: Link, atual: string): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  if ((link.target && link.target !== "_self") || link.download) return null;
  const de = new URL(atual);
  const para = new URL(link.href, atual);
  if (para.origin !== de.origin || (para.pathname === de.pathname && para.search === de.search)) return null;
  return para.pathname + para.search + para.hash;
}

type Guarda = (acao: () => void) => void;
// ponytail: uma guarda por vez (só o gerador de roteiros usa); vira lista se outra tela precisar.
let guarda: Guarda | null = null;

/** Liga a guarda; devolve a função que a desliga (só se ainda for ela). */
export const definirGuarda = (nova: Guarda) => {
  guarda = nova;
  return () => {
    if (guarda === nova) guarda = null;
  };
};

/** Saídas que não são links (aba "Ganchos", "Sair da conta"): passam pela guarda, se houver. */
export const sair = (acao: () => void) => (guarda ? guarda(acao) : acao());
