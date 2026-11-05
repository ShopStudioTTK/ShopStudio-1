import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Valor de uma chave dentro de [secao] (texto entre aspas ou palavra), sem pegar subseções como [secao.smtp].
const chave = (toml: string, secao: string, nome: string) =>
  toml
    .split(new RegExp(`^\\[${secao.replace(".", "\\.")}\\]\\s*$`, "m"))[1]
    ?.split(/^\[/m)[0]
    .match(new RegExp(`^${nome}\\s*=\\s*"?([^"\\s]+)"?`, "m"))?.[1];
const ligado = (toml: string, secao: string) => chave(toml, secao, "enabled");

const config = () => readFileSync(new URL("../../supabase/config.toml", import.meta.url), "utf8");

describe("supabase/config.toml", () => {
  it("lê o enabled da seção certa", () => {
    expect(ligado("[auth.email]\nenabled = true\n[auth.email.smtp]\nenabled = false\n", "auth.email")).toBe("true");
  });

  it("lê uma chave da seção certa", () => {
    expect(chave("[auth]\nenable_signup = false\n[auth.email]\nenable_signup = true\n", "auth", "enable_signup")).toBe("false");
  });

  // Login por e-mail + senha. As contas só nascem pelo servidor (webhook → src/lib/contas.ts).
  it("provedor de e-mail ligado", () => {
    expect(ligado(config(), "auth.email")).toBe("true");
  });

  // Ligado, qualquer pessoa cria conta com a anon key (achado 1 da auditoria de 2026-11-04).
  it("cadastro público desligado: só o servidor cria conta", () => {
    expect(chave(config(), "auth", "enable_signup")).toBe("false");
    expect(chave(config(), "auth.email", "enable_signup")).not.toBe("true");
  });

  it("sem login social", () => {
    expect(config()).not.toMatch(/^\[auth\.external\.\w+\][^[]*^enabled\s*=\s*true/m);
  });

  // Ligada, o navegador volta a ver tabelas e estrutura do banco. Os dados passam pelas rotas do servidor.
  it("Data API (PostgREST) desligada: o navegador não fala com o banco", () => {
    expect(ligado(config(), "api")).toBe("false");
  });

  // O app não usa realtime; ligado, qualquer um com a anon key usa os canais como mensageiro.
  it("realtime desligado", () => {
    expect(ligado(config(), "realtime")).toBe("false");
  });

  it("trocar a senha direto no Supabase exige reautenticação", () => {
    expect(chave(config(), "auth.email", "secure_password_change")).toBe("true");
  });

  it("token vale 15 minutos (o navegador renova sozinho)", () => {
    expect(chave(config(), "auth", "jwt_expiry")).toBe("900");
  });

  it("no máximo 10 logins a cada 5 minutos por IP", () => {
    expect(chave(config(), "auth.rate_limit", "sign_in_sign_ups")).toBe("10");
  });

  // Qualquer um com a anon key dispara /recover e /otp para uma conta existente. Sem link nem
  // código, o e-mail não serve para entrar nem para trocar senha ou e-mail por fora do app.
  it.each(["recovery", "magic_link", "email_change", "reauthentication"])("e-mail de %s sem link nem código", (tipo) => {
    const caminho = chave(config(), `auth.email.template.${tipo}`, "content_path");
    expect(caminho).toBeTruthy();
    const html = readFileSync(new URL(`../../${caminho}`, import.meta.url), "utf8");
    expect(html).not.toMatch(/\{\{/);
    expect(html).not.toMatch(/href/i);
  });
});
