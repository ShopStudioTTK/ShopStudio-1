import { admin, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { gerarEmbedding } from "@/lib/embedding";
import { texto, uuid } from "@/lib/entrada";
import { LIMIAR_PARECIDA, textoParaEmbedding, vetorSql } from "@/lib/treinamento";

export const runtime = "nodejs";

/**
 * Fila de treinamento da IA. Só admin (admin() confere a tabela `admins` no banco a cada chamada).
 * Nada daqui devolve user_id, embedding ou respondido_por: a expert vê só o texto.
 */
const STATUS = ["pendente", "respondida", "descartada"] as const;
type Status = (typeof STATUS)[number];
const ehStatus = (v: unknown): v is Status => STATUS.includes(v as Status);
const MAX_PERGUNTA = 1000;
const MAX_RESPOSTA = 4000;

/** Vetor ou null: embedding fora do ar nunca impede de salvar (a tela avisa "não indexada"). */
const vetorDe = (contexto: string | null, pergunta: string) =>
  gerarEmbedding(textoParaEmbedding(contexto ? contexto.split("\n") : [], pergunta)).then(vetorSql, (e) => {
    console.error("treinamento: falha no embedding", e);
    return null;
  });

type Linha = Record<string, unknown>;
const pergunta = (l: Linha) => ({
  id: l.id,
  origem: l.origem,
  status: l.status,
  pergunta: l.pergunta,
  contexto: l.contexto,
  resposta_ia: l.resposta_ia,
  resposta: l.resposta,
  indexada: l.indexada,
  criado_em: l.criado_em,
  respondido_em: l.respondido_em,
  parecida: l.parecida_id
    ? { id: l.parecida_id, pergunta: l.parecida_pergunta, resposta: l.parecida_resposta, similaridade: Number(l.parecida_similaridade) }
    : null,
});

export async function GET(req: Request) {
  const auth = await admin(req, "treinamento");
  if (auth instanceof Response) return auth;
  const pedido = new URL(req.url).searchParams.get("status");
  const status: Status = ehStatus(pedido) ? pedido : "pendente";
  const sql = db();

  // Em "pendente", a conversa inteira vem junto enquanto tiver alguma pergunta pendente.
  const [linhas, contagens] = await Promise.all([
    sql`
      select t.id, t.origem, t.status, t.conversa_id, t.ordem, t.contexto, t.pergunta, t.resposta_ia, t.resposta,
        t.embedding is not null as indexada, t.criado_em, t.respondido_em,
        p.id as parecida_id, p.pergunta as parecida_pergunta, p.resposta as parecida_resposta,
        p.similaridade as parecida_similaridade
      from public.treinamento t
      left join lateral (
        select r.id, r.pergunta, r.resposta, 1 - (r.embedding <=> t.embedding) as similaridade
        from public.treinamento r
        where r.status = 'respondida' and r.embedding is not null and r.id <> t.id
        order by r.embedding <=> t.embedding
        limit 1
      ) p on p.similaridade >= ${LIMIAR_PARECIDA}
      where t.status = ${status}
        or (${status} = 'pendente' and t.conversa_id in (
          select conversa_id from public.treinamento where status = 'pendente' and conversa_id is not null))
      order by t.criado_em desc`,
    sql`select status, count(*)::int as n from public.treinamento group by status`,
  ]);

  type Conversa = { id: string; criado_em: unknown; perguntas: (Linha & { ordem: number })[] };
  const conversas = new Map<string, Conversa>();
  const soltas: Linha[] = [];
  for (const l of linhas) {
    if (status === "pendente" && l.origem === "aluna" && l.conversa_id) {
      const c: Conversa = conversas.get(l.conversa_id) ?? { id: l.conversa_id, criado_em: l.criado_em, perguntas: [] };
      c.perguntas.push(l as Linha & { ordem: number });
      conversas.set(l.conversa_id, c);
    } else soltas.push(l);
  }
  const contagem = { pendente: 0, respondida: 0, descartada: 0 };
  for (const c of contagens) if (ehStatus(c.status)) contagem[c.status] = c.n;

  return Response.json({
    conversas: [...conversas.values()].map((c) => ({
      id: c.id,
      criado_em: c.criado_em,
      perguntas: c.perguntas.sort((a, b) => a.ordem - b.ordem).map(pergunta),
    })),
    soltas: soltas.map(pergunta),
    contagem,
  });
}

/** "Nova pergunta": criada pela administração, já respondida. */
export async function POST(req: Request) {
  const auth = await admin(req, "treinamento");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const p = texto(body?.pergunta, MAX_PERGUNTA);
  const r = texto(body?.resposta, MAX_RESPOSTA);
  if (!p || !r) return erro("Escreva a pergunta e a resposta.", 400);
  const v = await vetorDe(null, p);
  const [{ id }] = await db()`
    insert into public.treinamento (origem, status, pergunta, resposta, embedding, respondido_por, respondido_em)
    values ('admin', 'respondida', ${p}, ${r}, ${v}::extensions.vector, ${auth.userId}, now())
    returning id`;
  return Response.json({ id, indexada: v !== null });
}

/** Responder, editar, aprovar a da IA (a tela manda resposta = resposta_ia), descartar ou voltar para pendente. */
export async function PATCH(req: Request) {
  const auth = await admin(req, "treinamento");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const id = uuid(body?.id);
  const novaPergunta = texto(body?.pergunta, MAX_PERGUNTA);
  const resposta = texto(body?.resposta, MAX_RESPOSTA);
  const status = body?.status;
  if (!id) return erro("Pergunta inválida.", 400);
  if (status !== undefined && !ehStatus(status)) return erro("Status inválido.", 400);
  if (!novaPergunta && !resposta && !status) return erro("Nada para salvar.", 400);
  if (status === "respondida" && !resposta) return erro("Escreva a resposta.", 400);

  const sql = db();
  const [linha] = await sql`
    select pergunta, contexto, status, embedding is not null as indexada from public.treinamento where id = ${id}`;
  if (!linha) return erro("Pergunta não encontrada.", 404);

  const final: string = novaPergunta ?? linha.pergunta;
  const v = novaPergunta || resposta ? await vetorDe(linha.contexto, final) : null;
  // Falhou sem mudar a pergunta: o vetor antigo continua certo. Pergunta nova sem vetor = não indexada.
  const manter = v === null && !novaPergunta;
  const respondeu = resposta !== null;
  await sql`
    update public.treinamento set
      pergunta = ${final},
      embedding = case when ${manter} then embedding else ${v}::extensions.vector end,
      resposta = coalesce(${resposta}, resposta),
      status = ${respondeu ? "respondida" : (status ?? linha.status)},
      respondido_por = case when ${respondeu} then ${auth.userId}::uuid else respondido_por end,
      respondido_em = case when ${respondeu} then now() else respondido_em end
    where id = ${id}`;
  return Response.json({ indexada: v !== null || (manter && linha.indexada) });
}

export async function DELETE(req: Request) {
  const auth = await admin(req, "treinamento");
  if (auth instanceof Response) return auth;
  const id = uuid((await req.json().catch(() => null))?.id);
  if (!id) return erro("Pergunta inválida.", 400);
  const apagadas = await db()`delete from public.treinamento where id = ${id} returning id`;
  return apagadas.length ? new Response(null, { status: 204 }) : erro("Pergunta não encontrada.", 404);
}
