import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/conhecimento/material", () => ({ DOSSIE: "D", TRANSCRICAO: "T" }));

import { chaptersPartTwo } from "@/content/chapters-part-two";
import { BASE_PROMPT } from "@/lib/assistente";
import { METHOD } from "@/lib/roteiro";

// Aula 15: "tem outras formas de burlar isso sim, mas é perigoso você levar a punição,
// então melhor você escolher um som disponível". Nem o capítulo nem a IA ensinam o atalho.
describe("música no vídeo com produto", () => {
  const textos = { capitulos: JSON.stringify(chaptersPartTwo), assistente: BASE_PROMPT, roteiro: METHOD };

  it.each(Object.entries(textos))("%s não ensina publicar sem som e vincular depois", (_, texto) => {
    expect(texto).not.toMatch(/sem som/i);
    expect(texto).not.toMatch(/áudio em alta/i);
  });

  it.each(Object.entries(textos))("%s manda usar música liberada para uso comercial", (_, texto) => {
    expect(texto).toMatch(/uso comercial/i);
  });
});
