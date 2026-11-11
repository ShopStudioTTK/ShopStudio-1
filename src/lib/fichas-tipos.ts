/** Tipos das fichas de roteiro da expert, usados pelo servidor e pelas telas (sem segredo). */
export type Parte = { texto: string; porque: string | null; entonacao: string | null };

export type Gatilho = { slug: string; rotulo: string };

export type FichaCartao = {
  id: string;
  produto: string;
  tipo: string;
  formato: string;
  gatilho: Gatilho;
  gancho: Parte;
  problema: Parte;
  solucao: Parte;
  cta: Parte;
  /** Só nas fichas achadas pelo produto (cartão 1). */
  similaridade?: number;
  /** Só na lista da admin: a ficha entra em todo roteiro como exemplo de voz. */
  exemploFixo?: boolean;
};

/** Os dois cartões embaixo do roteiro. */
export type FichasDoRoteiro = { parecidas: FichaCartao[]; mesmoJeito: FichaCartao[] };

export const PARTES = [
  { chave: "gancho", rotulo: "Gancho" },
  { chave: "problema", rotulo: "Problema" },
  { chave: "solucao", rotulo: "Solução" },
  { chave: "cta", rotulo: "CTA" },
] as const;

/** Por que a ficha aparece embaixo do roteiro da aluna: só o que bate (produto, formato, gatilho). */
export const porQueAparece = (f: FichaCartao, formato: string, gatilho: string): string[] =>
  [
    f.similaridade != null && `Produto ${Math.round(f.similaridade * 100)}% parecido`,
    f.formato === formato && `Mesmo formato · ${f.formato}`,
    gatilho && f.gatilho.slug === gatilho && `Mesmo gatilho · ${f.gatilho.rotulo}`,
  ].filter((m): m is string => Boolean(m));

export type Colunas = 1 | 2 | 3 | 4 | 5 | 6;

/** Página Roteiros expert: quantos por linha a aluna escolheu (1 a 6; inválido = 4). */
export const colunasDaGrade = (valor: unknown): Colunas => {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? (n as Colunas) : 4;
};

/**
 * Quantas cabem de verdade, pela largura da tela (os mesmos sm/lg/xl das classes de GRADES na página):
 * celular 1; a partir de 640, até 2; a partir de 1024, até 3 (4 com a escolha 6); a partir de 1280, a escolha.
 */
export const colunasNaTela = (colunas: Colunas, largura: number): number =>
  largura < 640 ? 1 : largura < 1024 ? Math.min(colunas, 2) : largura < 1280 ? (colunas === 6 ? 4 : Math.min(colunas, 3)) : colunas;

/** Com mais de 3 na linha, o cartão fica resumido e o roteiro abre num pop-up. */
export const abreEmPopup = (colunas: Colunas, largura: number) => colunasNaTela(colunas, largura) > 3;
