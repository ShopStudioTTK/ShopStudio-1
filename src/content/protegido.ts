import "server-only";
import { desafioDias } from "./challenge-dias";
import { chaptersPartOne } from "./chapters-part-one";
import { chaptersPartTwo } from "./chapters-part-two";
import type { ConteudoProtegido } from "./types";
import { weekOneChecklist } from "./week-one-checklist";

/**
 * Todo conteúdo pago mora aqui, no servidor, e só sai por /api/conteudo/<nome>
 * (token conferido no Supabase + temAcesso). No navegador, use `useConteudo(nome)`.
 *
 * Conteúdo pago novo: arquivo em src/content com `import "server-only"` (o build falha se
 * uma tela importar direto), uma entrada aqui e o tipo em `ConteudoProtegido` (types.ts).
 */
const conteudos = new Map<string, unknown>([
  ["desafio", desafioDias],
  ["checklist", weekOneChecklist],
  ...[...chaptersPartOne, ...chaptersPartTwo].map((c) => [`capitulos/${c.slug}`, c.blocks] as const),
]);

export const getConteudo = <N extends keyof ConteudoProtegido>(nome: N): ConteudoProtegido[N] | undefined =>
  conteudos.get(nome) as ConteudoProtegido[N] | undefined;
