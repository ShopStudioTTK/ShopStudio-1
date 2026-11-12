import { describe, expect, it } from "vitest";
import { pertoDoFim } from "@/lib/rolagem";

describe("pertoDoFim", () => {
  it("no fundo ou a menos de 120 px dele: segue a resposta", () => {
    expect(pertoDoFim({ altura: 2000, janela: 700, rolagem: 1300 })).toBe(true);
    expect(pertoDoFim({ altura: 2000, janela: 700, rolagem: 1190 })).toBe(true);
  });
  it("subiu para ler: deixa onde ela está", () => {
    expect(pertoDoFim({ altura: 2000, janela: 700, rolagem: 1100 })).toBe(false);
    expect(pertoDoFim({ altura: 2000, janela: 700, rolagem: 0 })).toBe(false);
  });
});
