/**
 * Para onde a área logada manda quem ficou sem sessão.
 * Se a sessão caiu sozinha, guarda a página para voltar depois do login.
 * Se a pessoa clicou em "Sair", vai limpo: senão a próxima conta cairia na página da anterior.
 */
export const destinoSemSessao = (pathname: string, saiu: boolean): string =>
  saiu ? "/entrar" : `/entrar?de=${encodeURIComponent(pathname)}`;
