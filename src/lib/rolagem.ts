/** Distância do fundo (px) até onde a conversa ainda conta como "no fim" e segue a resposta. */
const MARGEM = 120;

/** A aluna está no fim da página (ou quase)? Se subiu para ler, a resposta não a puxa de volta. */
export const pertoDoFim = ({ altura, janela, rolagem }: { altura: number; janela: number; rolagem: number }) =>
  altura - janela - rolagem <= MARGEM;
