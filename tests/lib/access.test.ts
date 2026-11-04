import { describe, expect, it } from "vitest";
import { ACESSO_ABERTO_PARA_REVISAO, gerarCodigo, temAcesso } from "@/lib/access";

describe("access", () => {
  it("regra de acesso e código", () => {
    expect(temAcesso(true)).toBe(true);
    expect(temAcesso(false)).toBe(ACESSO_ABERTO_PARA_REVISAO);
    expect(gerarCodigo()).toMatch(/^SHOPSTUDIO-[A-Z0-9]{8}$/);
  });
});
