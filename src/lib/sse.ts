/** Extrai o campo `data:` dos eventos SSE completos do buffer; devolve o que sobrou incompleto. */
export const lerEventos = (buffer: string): { dados: string[]; resto: string } => {
  const blocos = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const resto = blocos.pop() ?? "";
  const dados = blocos
    .map((bloco) =>
      bloco
        .split("\n")
        .filter((linha) => linha.startsWith("data:"))
        .map((linha) => linha.slice(5).trimStart())
        .join("\n"),
    )
    .filter(Boolean);
  return { dados, resto };
};
