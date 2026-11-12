import { describe, expect, it } from "vitest";
import { duracaoDoFormato, ehFormatoDaAluna, FORMATOS, FORMATOS_DA_ALUNA } from "@/content/formatos";

describe("duracaoDoFormato", () => {
  it("Música viral: 7 a 15 s, sem fala, com os tempos de cada parte", () => {
    expect(duracaoDoFormato("Música viral")).toEqual({
      total: "7 a 15s · sem fala",
      etapas: { gancho: "0–2s", problema: "até 5s", solucao: "até 12s", cta: "até 15s" },
    });
  });
  it("os outros formatos (e formato desconhecido): 30 a 60 s", () => {
    for (const f of ["Conselho de amiga", "Unboxing", "", "outro"])
      expect(duracaoDoFormato(f)).toEqual({
        total: "30 a 60s",
        etapas: { gancho: "0–3s", problema: "até 15s", solucao: "até 45s", cta: "até 60s" },
      });
  });
});

describe("formatos da aluna", () => {
  it("sem a Música viral por enquanto (pedido da dona, 2026-11-12); os outros 4 na mesma ordem", () => {
    expect(FORMATOS_DA_ALUNA.map((f) => f.id)).toEqual(["Conselho de amiga", "Unboxing", "Tela verde", "Storytelling"]);
    expect(FORMATOS.map((f) => f.id)).toContain("Música viral");
  });
  it("ehFormatoDaAluna recusa a Música viral vinda da URL", () => {
    expect(ehFormatoDaAluna("Unboxing")).toBe(true);
    expect(ehFormatoDaAluna("Música viral")).toBe(false);
    expect(ehFormatoDaAluna(null)).toBe(false);
  });
});
