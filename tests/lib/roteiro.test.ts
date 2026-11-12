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
  it("METHOD segue as regras da especialista (instruções da Ana, 2026-11-06) e as durações por formato", () => {
    expect(METHOD).not.toContain("escassez e urgência");
    expect(METHOD).toContain("Escassez só no condicional");
    expect(METHOD).toContain("30 a 60 segundos");
    expect(METHOD).toContain("7 a 15 segundos");
    expect(METHOD).toContain("Nunca invente preço");
    expect(METHOD).toContain("O meio paga o que o gancho prometeu");
    expect(METHOD).toContain("Marca concorrente nunca");
  });
  it("a voz é a da Ana, com as marcas dela e as frases proibidas (feedback de 2026-11-11)", () => {
    expect(METHOD).toContain("COMO A ANA FALA");
    expect(METHOD).not.toContain("não da mentora");
    expect(METHOD).toContain("pelo menos 2 por roteiro");
    expect(METHOD).toMatch(/CAIXA ALTA: de 2 a 4 palavras/);
    expect(METHOD).toContain("suuuper");
    expect(METHOD).toMatch(/"produto incrível", "não perca"/);
    expect(METHOD).toContain("[mostrar de perto]");
  });
  it("regras por formato: unboxing antes de abrir, tela verde apontando, música viral sem fala", () => {
    expect(METHOD).toContain("ANTES de abrir a caixa");
    expect(METHOD).toContain("olha isso atrás de mim");
    expect(METHOD).toContain("Música viral: SEM FALA");
    expect(METHOD).toContain('"Texto na tela: …"');
  });
  it("ganchos: fofoca só entre as 5 opções, nunca no roteiro principal; indignação com preço só com preço", () => {
    expect(METHOD).toContain("nunca é o gancho do roteiro principal");
    expect(SYSTEM_PROMPT).toContain("1 de fofoca com prova social");
    expect(SYSTEM_PROMPT).toContain("nunca o de fofoca");
    expect(SYSTEM_PROMPT).toMatch(/indignação com preço se a aluna informou o preço/);
    expect(METHOD).toContain("No máximo 1 dos 5 ganchos cita o público pelo nome");
  });
  it("não inventa detalhe do produto nem preço: só compara com o preço que a aluna informou", () => {
    expect(METHOD).toContain("Só cite característica que esteja no que a aluna preencheu");
    expect(METHOD).toMatch(/cor, tamanho, variação/);
    expect(METHOD).toContain("só se a aluna informou promoção ou estoque");
    expect(METHOD).toContain("nunca invente preço de outra loja");
    expect(METHOD).not.toMatch(/vai esgotar rapidinho|sempre com urgência/i);
  });
  it("resultado como experiência dela, nunca garantia para quem assiste", () => {
    expect(METHOD).toContain("Resultado como experiência");
    expect(METHOD).toMatch(/"garantido", "100%", "nunca mais"/);
    expect(METHOD).toContain("prova que aparece no vídeo");
  });
  it("preço no pedido: com ele, pode citar e comparar só com ele; sem ele, nenhum valor", () => {
    const base = { produto: "Babydoll", publico: "", beneficio: "", formato: "Storytelling" };
    expect(buildUserPrompt({ ...base, preco: "R$ 59,90" })).toContain("Preço: R$ 59,90 (informado pela aluna");
    expect(buildUserPrompt({ ...base, preco: "" })).toContain("Preço: não informado");
  });
  it("SYSTEM_PROMPT diz Shop Studio", () => {
    expect(SYSTEM_PROMPT).toContain("Shop Studio");
    expect(SYSTEM_PROMPT).not.toContain("Club");
  });
  it("sem treino: SYSTEM_PROMPT + dossiê, com o formato JSON por último", () => {
    const p = buildSystemPrompt();
    expect(p.startsWith(SYSTEM_PROMPT)).toBe(true);
    expect(p).not.toContain("TOM DE VOZ DEFINIDO PELA ADMINISTRAÇÃO");
    expect(p).toContain("DOSSIE-TESTE");
    expect(p.indexOf("DOSSIE-TESTE")).toBeLessThan(p.lastIndexOf("APENAS com o objeto JSON"));
  });
  it("o bloco das fichas vem depois do dossiê e antes do lembrete final", () => {
    const p = buildSystemPrompt("BLOCO-FICHAS");
    expect(p.indexOf("BLOCO-FICHAS")).toBeGreaterThan(p.indexOf("DOSSIE-TESTE"));
    expect(p.indexOf("BLOCO-FICHAS")).toBeLessThan(p.lastIndexOf("Lembrete:"));
    expect(p.startsWith(SYSTEM_PROMPT)).toBe(true);
  });
  it("o JSON pede o campo gatilho", () => {
    expect(SYSTEM_PROMPT).toContain('"gatilho"');
  });
});
