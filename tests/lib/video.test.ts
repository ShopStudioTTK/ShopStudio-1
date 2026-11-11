import { describe, expect, it } from "vitest";
import { caminhoNoBucket, perfilDoTiktok, validadeDaUrlAssinada } from "@/lib/video";

describe("caminhoNoBucket", () => {
  it("extrai o caminho de um link público do bucket de vídeos", () => {
    expect(caminhoNoBucket("https://abc.supabase.co/storage/v1/object/public/studio-videos/aulas/aula%201.mp4")).toBe(
      "aulas/aula 1.mp4",
    );
    expect(caminhoNoBucket("http://localhost:54321/storage/v1/object/public/studio-videos/x.mp4?t=1")).toBe("x.mp4");
  });

  it("ignora links que não são do bucket", () => {
    expect(caminhoNoBucket("https://www.youtube.com/watch?v=abc")).toBeNull();
    expect(caminhoNoBucket("https://abc.supabase.co/storage/v1/object/public/outro-bucket/x.mp4")).toBeNull();
  });
});

describe("validadeDaUrlAssinada", () => {
  it("usa o valor do .env quando é um número inteiro positivo", () => {
    expect(validadeDaUrlAssinada("900")).toBe(900);
  });

  it("cai em 1 h quando falta, é inválido, zero ou negativo", () => {
    for (const v of [undefined, "", "abc", "0", "-60", "1.5"]) expect(validadeDaUrlAssinada(v), String(v)).toBe(3600);
  });
});

describe("perfilDoTiktok", () => {
  it("aceita @usuário, usuário solto ou o link do perfil, e devolve o link limpo", () => {
    for (const v of ["@ana.shop_1", "ana.shop_1", " https://www.tiktok.com/@ana.shop_1?lang=pt-BR ", "tiktok.com/@ana.shop_1", "https://www.tiktok.com/@ana.shop_1/video/123"])
      expect(perfilDoTiktok(v)).toBe("https://www.tiktok.com/@ana.shop_1");
  });

  it("recusa outro site, usuário inválido ou link sem perfil", () => {
    for (const v of ["https://instagram.com/@ana", "@a", "@ana com espaço", "https://www.tiktok.com/discover/x", "javascript:alert(1)", "@" + "a".repeat(25), ""])
      expect(perfilDoTiktok(v)).toBeNull();
  });
});
