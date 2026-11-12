import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarFila } from "@/lib/fila-de-players";

describe("criarFila", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("o primeiro sai na hora e os outros um a cada intervalo", () => {
    const fila = criarFila(1000);
    const liberados: string[] = [];
    fila.pedir(() => liberados.push("a"));
    fila.pedir(() => liberados.push("b"));
    fila.pedir(() => liberados.push("c"));

    expect(liberados).toEqual(["a"]);
    vi.advanceTimersByTime(999);
    expect(liberados).toEqual(["a"]);
    vi.advanceTimersByTime(1);
    expect(liberados).toEqual(["a", "b"]);
    vi.advanceTimersByTime(1000);
    expect(liberados).toEqual(["a", "b", "c"]);
  });

  it("quem cancela sai da fila e a vez passa para o próximo", () => {
    const fila = criarFila(1000);
    const liberados: string[] = [];
    fila.pedir(() => liberados.push("a"));
    const cancelarB = fila.pedir(() => liberados.push("b"));
    fila.pedir(() => liberados.push("c"));

    cancelarB();
    vi.advanceTimersByTime(1000);
    expect(liberados).toEqual(["a", "c"]);
    vi.advanceTimersByTime(5000);
    expect(liberados).toEqual(["a", "c"]);
  });

  it("pedido depois de a fila esvaziar respeita o intervalo desde a última liberação", () => {
    const fila = criarFila(1000);
    const liberados: string[] = [];
    fila.pedir(() => liberados.push("a"));
    vi.advanceTimersByTime(300);
    fila.pedir(() => liberados.push("b"));
    expect(liberados).toEqual(["a"]);
    vi.advanceTimersByTime(699);
    expect(liberados).toEqual(["a"]);
    vi.advanceTimersByTime(1);
    expect(liberados).toEqual(["a", "b"]);
  });

  it("depois de um tempo parada, o próximo pedido sai na hora", () => {
    const fila = criarFila(1000);
    const liberados: string[] = [];
    fila.pedir(() => liberados.push("a"));
    vi.advanceTimersByTime(5000);
    fila.pedir(() => liberados.push("b"));
    expect(liberados).toEqual(["a", "b"]);
  });

  it("cancelar quem já foi liberado não atrapalha", () => {
    const fila = criarFila(1000);
    const liberados: string[] = [];
    const cancelarA = fila.pedir(() => liberados.push("a"));
    fila.pedir(() => liberados.push("b"));
    cancelarA();
    vi.advanceTimersByTime(1000);
    expect(liberados).toEqual(["a", "b"]);
  });
});
