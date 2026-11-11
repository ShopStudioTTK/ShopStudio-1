import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/conhecimento/material", () => ({ DOSSIE: "DOSSIE-TESTE", TRANSCRICAO: "T" }));

import { buildSystemPrompt, buildUserPrompt, extractScriptJson, METHOD, SYSTEM_PROMPT } from "@/lib/roteiro";

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
  it("METHOD segue as regras da especialista (instruções da Ana, 2026-11-06)", () => {
    expect(METHOD).not.toContain("escassez e urgência");
    expect(METHOD).toContain("Escassez só no condicional");
    expect(METHOD).toContain("30 a 50 segundos");
    expect(METHOD).toContain("Nunca invente preço");
    expect(METHOD).toContain("O meio paga o que o gancho prometeu");
    expect(METHOD).toContain("Marca concorrente nunca");
  });
  it("ganchos variados: um de cada ângulo do método, e o público não se repete em todos (feedback de 2026-11-11)", () => {
    expect(SYSTEM_PROMPT).toContain("um de cada ângulo do método");
    expect(SYSTEM_PROMPT).toMatch(/curiosidade, problema, transformação, choque, prova social/);
    expect(METHOD).toContain("No máximo 1 dos 5 ganchos cita o público pelo nome");
  });
  it("não inventa detalhe do produto: cor, tamanho, preço e promoção só se a aluna informou", () => {
    expect(METHOD).toContain("Só cite característica que esteja no que a aluna preencheu");
    expect(METHOD).toMatch(/cor, tamanho, variação/);
    expect(METHOD).not.toContain("se ainda tiver nesse preço, aproveita");
    expect(METHOD).toContain("só se a aluna informou promoção ou estoque");
  });
  it("resultado como experiência dela, nunca garantia para quem assiste", () => {
    expect(METHOD).toContain("Resultado como experiência");
    expect(METHOD).toMatch(/"garantido", "100%", "nunca mais"/);
    expect(METHOD).toContain("prova que aparece no vídeo");
  });
  it("SYSTEM_PROMPT diz Shop Studio", () => {
    expect(SYSTEM_PROMPT).toContain("Shop Studio");
    expect(SYSTEM_PROMPT).not.toContain("Club");
  });
  it("sem treino nem base: SYSTEM_PROMPT + dossiê, com o formato JSON por último", () => {
    const p = buildSystemPrompt(null, []);
    expect(p.startsWith(SYSTEM_PROMPT)).toBe(true);
    expect(p).toContain("DOSSIE-TESTE");
    expect(p.indexOf("DOSSIE-TESTE")).toBeLessThan(p.lastIndexOf("APENAS com o objeto JSON"));
  });
  it("o bloco das fichas vem depois do dossiê e antes do lembrete final", () => {
    const p = buildSystemPrompt(null, [], "BLOCO-FICHAS");
    expect(p.indexOf("BLOCO-FICHAS")).toBeGreaterThan(p.indexOf("DOSSIE-TESTE"));
    expect(p.indexOf("BLOCO-FICHAS")).toBeLessThan(p.lastIndexOf("Lembrete:"));
    expect(p.startsWith(SYSTEM_PROMPT)).toBe(true);
  });
  it("o JSON pede o campo gatilho", () => {
    expect(SYSTEM_PROMPT).toContain('"gatilho"');
  });
  it("limita a 20 itens e 600 caracteres", () => {
    const k = Array.from({ length: 25 }, (_, i) => ({ titulo: "t" + i, conteudo: "x".repeat(700) }));
    const p = buildSystemPrompt(null, k);
    expect(p).toContain("t19");
    expect(p).not.toContain("t20");
    expect(p).not.toContain("x".repeat(601));
  });
});
