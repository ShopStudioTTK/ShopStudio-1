// Usado no servidor (validação do que a admin publica) e na tela (tipos e limites do formulário).

export type Notificacao = {
  id: string;
  titulo: string;
  descricao: string;
  link: string | null;
  link_texto: string | null;
  criado_em: string;
  /** A partir de quando aparece (sem data na criação = na hora). */
  aparece_em: string;
  vista: boolean;
};

export const MAX_NOTIFICACAO = { titulo: 120, descricao: 2000, linkTexto: 60 } as const;

export type NovaNotificacao = {
  titulo: string;
  descricao: string;
  link: string | null;
  linkTexto: string | null;
  /** null = na hora (o banco usa now()). */
  apareceEm: string | null;
};

const UM_ANO_MS = 366 * 24 * 60 * 60 * 1000;

/** Já apareceu? Na tela, a admin recebe também as agendadas. */
export const jaApareceu = (n: Pick<Notificacao, "aparece_em">, agora = new Date()) => new Date(n.aparece_em) <= agora;

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * O que a admin mandou, limpo, ou a mensagem de erro. Link só https; sem link, o texto dele some.
 * Data no passado vira "na hora": senão quem ganhou conta entre a data e agora não veria.
 */
export const novaNotificacao = (body: unknown, agora = new Date()): NovaNotificacao | string => {
  const b = (body ?? {}) as Record<string, unknown>;
  const titulo = texto(b.titulo);
  const descricao = texto(b.descricao);
  const bruto = texto(b.link);
  const linkTexto = texto(b.linkTexto);
  if (!titulo) return "Escreva o título.";
  if (!descricao) return "Escreva a descrição.";
  if (titulo.length > MAX_NOTIFICACAO.titulo) return `O título pode ter até ${MAX_NOTIFICACAO.titulo} caracteres.`;
  if (descricao.length > MAX_NOTIFICACAO.descricao) return `A descrição pode ter até ${MAX_NOTIFICACAO.descricao} caracteres.`;
  let apareceEm: string | null = null;
  const data = texto(b.apareceEm);
  if (data) {
    const quando = new Date(data);
    if (Number.isNaN(quando.getTime())) return "Data para aparecer inválida.";
    if (quando.getTime() - agora.getTime() > UM_ANO_MS) return "A data para aparecer pode ser no máximo daqui a um ano.";
    if (quando > agora) apareceEm = quando.toISOString();
  }
  if (!bruto) return { titulo, descricao, link: null, linkTexto: null, apareceEm };
  let link: URL;
  try {
    link = new URL(bruto);
  } catch {
    return "O link precisa começar com https://.";
  }
  if (link.protocol !== "https:" || link.href.length > 2000) return "O link precisa começar com https://.";
  if (linkTexto.length > MAX_NOTIFICACAO.linkTexto) return `O texto do link pode ter até ${MAX_NOTIFICACAO.linkTexto} caracteres.`;
  return { titulo, descricao, link: link.href, linkTexto: linkTexto || null, apareceEm };
};
