import { describe, expect, it } from "vitest";
import { NICHOS } from "@/content/nichos";

describe("NICHOS (abas dos campeões)", () => {
  it("5 abas com slug único e rótulo", () => {
    expect(NICHOS).toHaveLength(5);
    expect(new Set(NICHOS.map((n) => n.slug)).size).toBe(5);
    for (const n of NICHOS) {
      expect(n.slug).toMatch(/^[a-z-]+$/);
      expect(n.rotulo).toBeTruthy();
    }
  });
});
