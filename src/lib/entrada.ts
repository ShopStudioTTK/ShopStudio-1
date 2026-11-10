/** Texto vindo do navegador: aparado e com tamanho máximo. Vazio vira null. */
export const texto = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?id=` de uma linha: só aceita uuid. */
export const idDaUrl = (req: Request): string | null => {
  const id = new URL(req.url).searchParams.get("id");
  return id && UUID.test(id) ? id : null;
};

/** uuid vindo do corpo (id de linha, id de conversa). Outro formato vira null. */
export const uuid = (v: unknown): string | null => (typeof v === "string" && UUID.test(v) ? v : null);

/** Slug de aba dos Campeões: o mesmo formato que o banco aceita em `nichos.slug`. */
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Casa & Cozinha" → "casa-cozinha". */
export const slugDe = (rotulo: string) =>
  rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

/** E-mail: o mesmo formato nos webhooks e na conta da aluna. */
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 6 = minimum_password_length do supabase/config.toml; 72 = limite do bcrypt. */
export const SENHA_MIN = 6;
export const SENHA_MAX = 72;
export const senhaValida = (v: unknown): v is string =>
  typeof v === "string" && v.length >= SENHA_MIN && v.length <= SENHA_MAX;
