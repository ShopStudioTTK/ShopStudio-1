export type HookCategoria = "quebra" | "problema" | "curiosidade";

/** Gancho como sai de GET /api/ganchos: do banco do Studio ou da comunidade, com as notas. */
export type Gancho = {
  id: string;
  categoria: HookCategoria;
  texto: string;
  comunidade: boolean;
  /** média das notas (1 a 5), uma casa decimal; null sem nota */
  media: number | null;
  notas: number;
  /** a nota da aluna logada */
  minhaNota: number | null;
};

export const hookCategorias: {
  id: HookCategoria;
  label: string;
  hint: string;
}[] = [
  { id: "quebra", label: "Quebra de padrão", hint: "Choque e fofoca" },
  { id: "problema", label: "Problema", hint: "Dor e identificação" },
  { id: "curiosidade", label: "Curiosidade", hint: "Vontade de saber o resto" },
];
