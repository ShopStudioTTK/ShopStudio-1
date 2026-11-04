import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

// Texto das aulas e do dossiê, editável à mão nos .md desta pasta. Só existe no servidor:
// o next.config.ts inclui os .md no deploy das rotas de IA.
const ler = (arquivo: string) =>
  readFileSync(path.join(process.cwd(), "src/lib/conhecimento", arquivo), "utf8").trim();

export const TRANSCRICAO = ler("transcricao.md");
export const DOSSIE = ler("dossie.md");
