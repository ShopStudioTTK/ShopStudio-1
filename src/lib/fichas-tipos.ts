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
