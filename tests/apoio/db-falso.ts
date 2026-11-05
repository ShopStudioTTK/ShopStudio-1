import { vi } from "vitest";

/**
 * Banco falso para testar rotas: registra cada consulta (texto + valores) e responde conforme
 * `responderCom`. Uso: vi.mock("@/lib/db", async () => ({ db: () => (await import("…/db-falso")).sqlFalso }))
 */
export type Consulta = { sql: string; valores: unknown[] };
type Resposta = Record<string, unknown>[] | Error;

export const consultas: Consulta[] = [];
let regras: [string, Resposta | (() => Resposta)][] = [];

/** Primeira regra cujo trecho aparece no SQL responde. Sem regra: nenhuma linha. */
export const responderCom = (novas: [string, Resposta | (() => Resposta)][]) => {
  regras = novas;
};

export const reiniciarDb = () => {
  consultas.length = 0;
  regras = [];
};

export const sqlFalso = (partes: TemplateStringsArray, ...valores: unknown[]) => {
  const consulta = { sql: partes.join("?").replace(/\s+/g, " ").trim(), valores };
  consultas.push(consulta);
  const regra = regras.find(([trecho]) => consulta.sql.includes(trecho));
  const r = typeof regra?.[1] === "function" ? regra[1]() : (regra?.[1] ?? []);
  return r instanceof Error ? Promise.reject(r) : Promise.resolve(Object.assign([...r], { count: r.length }));
};

/** Consultas que tocam a tabela. */
export const naTabela = (tabela: string) => consultas.filter((c) => c.sql.includes(`public.${tabela}`));

export const getUser = vi.fn();
export const createSignedUrls = vi.fn();
export const createUser = vi.fn();
export const deleteUser = vi.fn();
export const updateUserById = vi.fn();
/** Mock de @/lib/supabase/admin: só login, contas e storage (o banco é o db falso). */
export const adminFalso = {
  createAdminClient: () => ({
    auth: { getUser, admin: { createUser, deleteUser, updateUserById } },
    storage: { from: () => ({ createSignedUrls }) },
  }),
};
