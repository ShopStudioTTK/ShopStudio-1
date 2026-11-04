/**
 * MODO REVISÃO
 * Enquanto estiver `true`, qualquer pessoa que criar uma conta entra no app,
 * mesmo sem código de compra, para validar tudo antes do lançamento.
 * No dia da venda, troque para `false` e o portão de código volta a valer sozinho.
 */
export const ACESSO_ABERTO_PARA_REVISAO = true;

export const temAcesso = (possuiEntitlement: boolean): boolean =>
  ACESSO_ABERTO_PARA_REVISAO || possuiEntitlement;

export const gerarCodigo = (): string => {
  const bloco = () => Math.random().toString(36).slice(2, 6).padEnd(4, "0").toUpperCase();
  return `SHOPSTUDIO-${bloco()}${bloco()}`;
};
