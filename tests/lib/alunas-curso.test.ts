import { describe, expect, it } from "vitest";
import { emailsDoTexto } from "@/lib/alunas-curso";

describe("emailsDoTexto", () => {
  it("acha e-mails em lista, CSV e planilha, minúsculos e sem repetir", () => {
    const t = 'nome,email\n"Maria",Maria@X.com\nJoana <joana@y.com.br>; maria@x.com\nsem email aqui\tana@z.com.';
    expect(emailsDoTexto(t)).toEqual(["maria@x.com", "joana@y.com.br", "ana@z.com"]);
  });
  it("texto sem e-mail → vazio", () => expect(emailsDoTexto("nada @ aqui")).toEqual([]));
});
