import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildSystemPrompt, buildUserPrompt, extractScriptJson, SYSTEM_PROMPT } from "./roteiro";

describe("extractScriptJson", () => {
  it("tira cercas de código", () => {
    expect(extractScriptJson('```json\n{"ganchos":["a"]}\n```')).toEqual({ ganchos: ["a"] });
  });
  it("tira texto antes e depois", () => {
    expect(extractScriptJson('Claro! {"ctas":["x"]} espero ter ajudado')).toEqual({ ctas: ["x"] });
  });
  it("lança quando não há JSON", () => {
    expect(() => extractScriptJson("sem json")).toThrow("A resposta da IA veio em formato inesperado. Tente de novo.");
  });
});

describe("prompts", () => {
  it("usa os defaults do usuário", () => {
    const p = buildUserPrompt({ produto: "Sérum", publico: "", beneficio: "", formato: "" });
    expect(p).toContain("Público: mulheres brasileiras que compram por impulso no TikTok");
    expect(p).toContain("Formato desejado: conselho de amiga");
  });
  it("SYSTEM_PROMPT diz Shop Studio", () => {
    expect(SYSTEM_PROMPT).toContain("Shop Studio");
    expect(SYSTEM_PROMPT).not.toContain("Club");
  });
  it("sem treino nem base devolve o SYSTEM_PROMPT", () => {
    expect(buildSystemPrompt(null, [])).toBe(SYSTEM_PROMPT);
  });
  it("limita a 20 itens e 600 caracteres", () => {
    const k = Array.from({ length: 25 }, (_, i) => ({ titulo: "t" + i, conteudo: "x".repeat(700) }));
    const p = buildSystemPrompt(null, k);
    expect(p).toContain("t19");
    expect(p).not.toContain("t20");
    expect(p).not.toContain("x".repeat(601));
  });
});
