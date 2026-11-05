import { describe, expect, it } from "vitest";
import { cabecalhosDeSeguranca } from "@/lib/seguranca";

const SUPA = "https://abc.supabase.co";
const csp = (dev: boolean) =>
  cabecalhosDeSeguranca(SUPA, dev).find((h) => h.key === "Content-Security-Policy")!.value;
const valor = (key: string) => cabecalhosDeSeguranca(SUPA, false).find((h) => h.key === key)?.value;

describe("cabecalhosDeSeguranca", () => {
  it("só deixa a página falar com o próprio app e com o Supabase (protege o token do localStorage)", () => {
    expect(csp(false)).toContain(`connect-src 'self' ${SUPA}`);
    expect(csp(false)).not.toMatch(/connect-src[^;]*\*/);
  });

  it("não deixa o app ser embutido em outro site nem carregar plugins", () => {
    expect(csp(false)).toContain("frame-ancestors 'none'");
    expect(csp(false)).toContain("object-src 'none'");
    expect(valor("X-Frame-Options")).toBe("DENY");
  });

  it("só libera os players de vídeo usados no app", () => {
    expect(csp(false)).toContain("frame-src https://www.youtube.com https://player.vimeo.com https://www.tiktok.com");
  });

  it("eval só em desenvolvimento (o Next precisa no modo dev)", () => {
    expect(csp(false)).not.toContain("'unsafe-eval'");
    expect(csp(true)).toContain("'unsafe-eval'");
  });

  it("cabeçalhos básicos", () => {
    expect(valor("X-Content-Type-Options")).toBe("nosniff");
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valor("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
  });
});
