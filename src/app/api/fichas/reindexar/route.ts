import { admin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { gerarEmbedding } from "@/lib/embedding";
import { textoDaFicha } from "@/lib/fichas";
import { vetorSql } from "@/lib/treinamento";

export const runtime = "nodejs";
export const maxDuration = 60;

// ponytail: 4 embeddings por vez; com centenas de fichas, fazer em lotes de vários pedidos.
const POR_VEZ = 4;

/**
 * Só admin: refaz o embedding de todas as fichas com o texto atual de `textoDaFicha` (em minúsculas
 * desde 2026-11-11). Ficha que falhar fica com o vetor que tinha.
 */
export async function POST(req: Request) {
  const auth = await admin(req, "fichas-reindexar");
  if (auth instanceof Response) return auth;
  const sql = db();
  const fichas = await sql`select id, produto, tipo from public.fichas_roteiro order by criado_em`;
  let indexadas = 0;
  for (let i = 0; i < fichas.length; i += POR_VEZ) {
    await Promise.all(
      fichas.slice(i, i + POR_VEZ).map(async (f) => {
        try {
          const v = vetorSql(await gerarEmbedding(textoDaFicha(String(f.produto), String(f.tipo))));
          await sql`update public.fichas_roteiro set embedding = ${v}::extensions.vector where id = ${f.id}`;
          indexadas++;
        } catch (e) {
          console.error("fichas-reindexar: falha numa ficha", e);
        }
      }),
    );
  }
  return Response.json({ total: fichas.length, indexadas });
}
