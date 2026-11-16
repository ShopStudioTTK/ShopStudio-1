// Usado no servidor (validação do que a admin publica) e na tela (tipos e limites do formulário).

export type Notificacao = {
  id: string;
  titulo: string;
  descricao: string;
  link: string | null;
  link_texto: string | null;
  criado_em: string;
  vista: boolean;
};

export const MAX_NOTIFICACAO = { titulo: 120, descricao: 2000, linkTexto: 60 } as const;

export type NovaNotificacao = { titulo: string; descricao: string; link: string | null; linkTexto: string | null };

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** O que a admin mandou, limpo, ou a mensagem de erro. Link só https; sem link, o texto dele some. */
export const novaNotificacao = (body: unknown): NovaNotificacao | string => {
  const b = (body ?? {}) as Record<string, unknown>;
  const titulo = texto(b.titulo);
  const descricao = texto(b.descricao);
  const bruto = texto(b.link);
  const linkTexto = texto(b.linkTexto);
  if (!titulo) return "Escreva o título.";
  if (!descricao) return "Escreva a descrição.";
  if (titulo.length > MAX_NOTIFICACAO.titulo) return `O título pode ter até ${MAX_NOTIFICACAO.titulo} caracteres.`;
  if (descricao.length > MAX_NOTIFICACAO.descricao) return `A descrição pode ter até ${MAX_NOTIFICACAO.descricao} caracteres.`;
  if (!bruto) return { titulo, descricao, link: null, linkTexto: null };
  let link: URL;
  try {
    link = new URL(bruto);
  } catch {
    return "O link precisa começar com https://.";
  }
  if (link.protocol !== "https:" || link.href.length > 2000) return "O link precisa começar com https://.";
  if (linkTexto.length > MAX_NOTIFICACAO.linkTexto) return `O texto do link pode ter até ${MAX_NOTIFICACAO.linkTexto} caracteres.`;
  return { titulo, descricao, link: link.href, linkTexto: linkTexto || null };
};
