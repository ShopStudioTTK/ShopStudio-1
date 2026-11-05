import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Valor de `enabled` dentro de [auth.email], sem pegar subseções como [auth.email.smtp].
const emailLigado = (toml: string) =>
  toml.split(/^\[auth\.email\]\s*$/m)[1]?.split(/^\[/m)[0].match(/^enabled\s*=\s*(\w+)/m)?.[1];

describe("supabase/config.toml", () => {
  it("lê o enabled da seção certa", () => {
    expect(emailLigado("[auth.email]\nenabled = true\n[auth.email.smtp]\nenabled = false\n")).toBe("true");
  });

  // Ligado, qualquer pessoa cria conta com a anon key (ver commit c8f1d5e e CLAUDE.md, Armadilhas).
  it("provedor de e-mail desligado: só o Google cria conta", () => {
    const toml = readFileSync(new URL("../../supabase/config.toml", import.meta.url), "utf8");
    expect(emailLigado(toml)).toBe("false");
  });
});
