import { describe, expect, it } from "vitest";
import { NICHOS } from "@/content/nichos";

describe("NICHOS (abas dos campeões)", () => {
  it("5 abas com slug único, rótulo, buscas e palavras", () => {
    expect(NICHOS).toHaveLength(5);
    expect(new Set(NICHOS.map((n) => n.slug)).size).toBe(5);
    for (const n of NICHOS) {
      expect(n.slug).toMatch(/^[a-z-]+$/);
      expect(n.rotulo).toBeTruthy();
      expect(n.buscas.length).toBeGreaterThan(0);
      expect(n.palavras.length).toBeGreaterThan(0);
      // as palavras são comparadas com o texto sem acento e em minúsculas
      for (const p of n.palavras) expect(p).toBe(p.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());
    }
  });
});
