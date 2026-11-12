import "server-only";
import { db } from "@/lib/db";

/**
 * Acrescenta a pergunta e a resposta ao histórico da aluna ("Conversas anteriores"). A primeira
 * pergunta vira o título. Sempre com o userId do token; `conversa` é o id que o navegador criou.
 */
export const guardarNaConversa = async (p: { userId: string; conversa: string; pergunta: string; resposta: string }) => {
  // Vai como texto e o banco converte (::text::jsonb): passado direto, o driver codificaria o JSON duas vezes.
  const mensagens = JSON.stringify([
    { role: "user", content: p.pergunta },
    { role: "assistant", content: p.resposta },
  ]);
  await db()`
    insert into public.conversas (user_id, id, titulo, mensagens)
    values (${p.userId}, ${p.conversa}, ${p.pergunta.trim().slice(0, 120)}, ${mensagens}::text::jsonb)
    on conflict (user_id, id) do update set mensagens = conversas.mensagens || excluded.mensagens, atualizado_em = now()`;
};
