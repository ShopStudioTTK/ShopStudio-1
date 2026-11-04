type Metadata = Record<string, unknown> | undefined;

/** Nome completo da aluna: o Google manda `full_name`/`name`; cadastros antigos usavam `nome`. */
export const nomeDoPerfil = (metadata: Metadata): string | null => {
  const nome = metadata?.full_name ?? metadata?.name ?? metadata?.nome;
  return typeof nome === "string" && nome.trim() ? nome.trim() : null;
};

/** Para saudações: primeiro nome, ou o começo do e-mail. */
export const primeiroNome = (metadata: Metadata, email: string | undefined): string =>
  (nomeDoPerfil(metadata) ?? email ?? "").split(/[\s@]/)[0];
