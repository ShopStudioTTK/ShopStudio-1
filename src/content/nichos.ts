/** Abas da tela de Campeões. Os vídeos de cada uma são cadastrados pela administração (tabela `campeoes`). */
export type Nicho = { slug: string; rotulo: string };

export const NICHOS: Nicho[] = [
  { slug: "moda-fitness", rotulo: "Moda fitness" },
  { slug: "beleza", rotulo: "Beleza" },
  { slug: "maternidade", rotulo: "Maternidade" },
  { slug: "casa-e-cozinha", rotulo: "Casa e cozinha" },
  { slug: "moda-feminina", rotulo: "Moda feminina" },
];
