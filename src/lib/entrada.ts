/** Texto vindo do navegador: aparado e com tamanho máximo. Vazio vira null. */
export const texto = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?id=` de uma linha: só aceita uuid. */
export const idDaUrl = (req: Request): string | null => {
  const id = new URL(req.url).searchParams.get("id");
  return id && UUID.test(id) ? id : null;
};
