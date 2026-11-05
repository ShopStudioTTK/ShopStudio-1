export type HookCategoria = "quebra" | "problema" | "curiosidade";

export type Gancho = { id: string; categoria: HookCategoria; texto: string };

export const hookCategorias: {
  id: HookCategoria;
  label: string;
  hint: string;
}[] = [
  { id: "quebra", label: "Quebra de padrão", hint: "Choque e fofoca" },
  { id: "problema", label: "Problema", hint: "Dor e identificação" },
  { id: "curiosidade", label: "Curiosidade", hint: "Vontade de saber o resto" },
];
