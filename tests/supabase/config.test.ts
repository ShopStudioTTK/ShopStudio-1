import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Valor de `enabled` dentro de [secao], sem pegar subseções como [secao.smtp].
const ligado = (toml: string, secao: string) =>
  toml.split(new RegExp(`^\\[${secao.replace(".", "\\.")}\\]\\s*$`, "m"))[1]?.split(/^\[/m)[0].match(/^enabled\s*=\s*(\w+)/m)?.[1];

const config = () => readFileSync(new URL("../../supabase/config.toml", import.meta.url), "utf8");

describe("supabase/config.toml", () => {
  it("lê o enabled da seção certa", () => {
    expect(ligado("[auth.email]\nenabled = true\n[auth.email.smtp]\nenabled = false\n", "auth.email")).toBe("true");
  });

  // Ligado, qualquer pessoa cria conta com a anon key (ver commit c8f1d5e e CLAUDE.md, Armadilhas).
  it("provedor de e-mail desligado: só o Google cria conta", () => {
    expect(ligado(config(), "auth.email")).toBe("false");
  });

  // Ligada, o navegador volta a ver tabelas e estrutura do banco. Os dados passam pelas rotas do servidor.
  it("Data API (PostgREST) desligada: o navegador não fala com o banco", () => {
    expect(ligado(config(), "api")).toBe("false");
  });
});
