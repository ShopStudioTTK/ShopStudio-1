import { describe, expect, it, vi } from "vitest";
import { definirGuarda, destinoDoClique, sair } from "@/lib/saida";

const ATUAL = "http://localhost:3000/app/roteiros?aba=gerador";
const clique = (o: Partial<Parameters<typeof destinoDoClique>[0]> = {}) => ({
  button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...o,
});
const link = (href: string, o: { target?: string; download?: boolean } = {}) => ({ href, target: "", download: false, ...o });

describe("destinoDoClique", () => {
  it("link para outra página do app → o caminho, com query e âncora", () => {
    expect(destinoDoClique(clique(), link("http://localhost:3000/app/assistente"), ATUAL)).toBe("/app/assistente");
    expect(destinoDoClique(clique(), link("http://localhost:3000/app/roteiros"), ATUAL)).toBe("/app/roteiros");
    expect(destinoDoClique(clique(), link("http://localhost:3000/app/campeoes?nicho=beleza#topo"), ATUAL)).toBe(
      "/app/campeoes?nicho=beleza#topo",
    );
  });

  it("mesma página (ou só a âncora muda) não é saída", () => {
    expect(destinoDoClique(clique(), link(ATUAL), ATUAL)).toBeNull();
    expect(destinoDoClique(clique(), link(`${ATUAL}#biblioteca`), ATUAL)).toBeNull();
  });

  it("o navegador cuida: outra aba, botão do meio, teclas, download, outro site", () => {
    const destino = "http://localhost:3000/app/assistente";
    expect(destinoDoClique(clique({ ctrlKey: true }), link(destino), ATUAL)).toBeNull();
    expect(destinoDoClique(clique({ metaKey: true }), link(destino), ATUAL)).toBeNull();
    expect(destinoDoClique(clique({ shiftKey: true }), link(destino), ATUAL)).toBeNull();
    expect(destinoDoClique(clique({ button: 1 }), link(destino), ATUAL)).toBeNull();
    expect(destinoDoClique(clique(), link(destino, { target: "_blank" }), ATUAL)).toBeNull();
    expect(destinoDoClique(clique(), link(destino, { download: true }), ATUAL)).toBeNull();
    expect(destinoDoClique(clique(), link("https://www.tiktok.com/@ana"), ATUAL)).toBeNull();
  });

  it("clique já cancelado por outro código não é saída", () => {
    expect(destinoDoClique(clique({ defaultPrevented: true }), link("http://localhost:3000/app"), ATUAL)).toBeNull();
  });
});

describe("sair", () => {
  it("sem guarda, sai direto; com guarda, ela decide; depois de soltar, sai direto de novo", () => {
    const acao = vi.fn();
    sair(acao);
    expect(acao).toHaveBeenCalledTimes(1);

    const guarda = vi.fn();
    const soltar = definirGuarda(guarda);
    sair(acao);
    expect(acao).toHaveBeenCalledTimes(1);
    expect(guarda).toHaveBeenCalledWith(acao);

    soltar();
    sair(acao);
    expect(acao).toHaveBeenCalledTimes(2);
  });

  it("soltar uma guarda antiga não derruba a nova", () => {
    const soltarVelha = definirGuarda(vi.fn());
    const nova = vi.fn();
    const soltarNova = definirGuarda(nova);
    soltarVelha();
    sair(() => {});
    expect(nova).toHaveBeenCalled();
    soltarNova();
  });
});
