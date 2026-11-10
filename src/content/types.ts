import type { DesafioDia } from "./challenge";

export type CalloutVariant = "pratica" | "lembre" | "atencao" | "ouro";

export type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "callout"; variant: CalloutVariant; title?: string; text: string }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "cards"; items: { title: string; text: string }[] }
  | { type: "list"; items: string[] }
  | { type: "table"; columns: string[]; rows: string[][] }
  | { type: "checklist"; items: string[] };

export type Chapter = {
  slug: string;
  number: number;
  title: string;
  subtitle: string;
  summary: string;
  readingMinutes: number;
};

/** Corpo de um capítulo: só no servidor (ver protegido.ts). */
export type CorpoCapitulo = { slug: string; blocks: Block[] };

export type ChecklistItem = { key: string; label: string };

/** O que cada nome de /api/conteudo/<nome> devolve (o registro fica em protegido.ts). */
export type ConteudoProtegido = {
  desafio: DesafioDia[];
  checklist: ChecklistItem[];
} & { [slug: `capitulos/${string}`]: Block[] };
