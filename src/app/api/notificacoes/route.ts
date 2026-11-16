import { admin, autenticar, ehAdmin, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { uuid } from "@/lib/entrada";
import { novaNotificacao } from "@/lib/notificacoes";

/**
 * Notificações da aluna: só as que já apareceram (`aparece_em`) e cuja data é depois da criação da
 * conta dela (data do usuário do token), as mais novas primeiro, com `vista`. Admin vê todas, até as
 * agendadas, para poder apagar.
 */
export async function GET(req: Request) {
  const auth = await autenticar(req, "notificacoes", "Faça login.");
  if (auth instanceof Response) return auth;
  const adm = await ehAdmin(auth.userId).catch(() => false);
  try {
    const notificacoes = await db()`
      select n.id, n.titulo, n.descricao, n.link, n.link_texto, n.criado_em, n.aparece_em, (v.user_id is not null) as vista
      from public.notificacoes n
      left join public.notificacoes_vistas v on v.notificacao_id = n.id and v.user_id = ${auth.userId}
      where ${adm} or (n.aparece_em <= now() and n.aparece_em > ${auth.user.created_at ?? "infinity"}::timestamptz)
      order by n.aparece_em desc limit 50`;
    return Response.json({ notificacoes });
  } catch (e) {
    console.error("notificacoes: falha ao ler", e);
    return erro("Não consegui ler suas notificações agora.", 500);
  }
}

/** A aluna fechou o pop-up: a notificação fica como vista, em nome dela. */
export async function PATCH(req: Request) {
  const auth = await autenticar(req, "notificacoes", "Faça login.");
  if (auth instanceof Response) return auth;
  const id = uuid((await req.json().catch(() => null))?.id);
  if (!id) return erro("Notificação inválida.", 400);
  try {
    await db()`
      insert into public.notificacoes_vistas (notificacao_id, user_id)
      select id, ${auth.userId} from public.notificacoes where id = ${id}
      on conflict do nothing`;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("notificacoes: falha ao marcar como vista", e);
    return erro("Não consegui guardar agora.", 500);
  }
}

/** Publica uma notificação (só admin). Para quem publicou, ela já nasce vista (sem pop-up da própria). */
export async function POST(req: Request) {
  const auth = await admin(req, "notificacoes");
  if (auth instanceof Response) return auth;
  const nova = novaNotificacao(await req.json().catch(() => null));
  if (typeof nova === "string") return erro(nova, 400);
  try {
    const [notificacao] = await db()`
      with n as (
        insert into public.notificacoes (titulo, descricao, link, link_texto, aparece_em)
        values (${nova.titulo}, ${nova.descricao}, ${nova.link}, ${nova.linkTexto}, coalesce(${nova.apareceEm}::timestamptz, now()))
        returning id, titulo, descricao, link, link_texto, criado_em, aparece_em
      ), vista as (insert into public.notificacoes_vistas (notificacao_id, user_id) select id, ${auth.userId} from n)
      select * from n`;
    return Response.json({ notificacao }, { status: 201 });
  } catch (e) {
    console.error("notificacoes: falha ao publicar", e);
    return erro("Não consegui publicar agora.", 500);
  }
}

/** Apaga uma notificação (só admin); some também da lista de quem já viu. */
export async function DELETE(req: Request) {
  const auth = await admin(req, "notificacoes");
  if (auth instanceof Response) return auth;
  const id = uuid(new URL(req.url).searchParams.get("id"));
  if (!id) return erro("Notificação inválida.", 400);
  try {
    const apagadas = await db()`delete from public.notificacoes where id = ${id} returning id`;
    return apagadas.length ? Response.json({ ok: true }) : erro("Essa notificação não existe mais.", 404);
  } catch (e) {
    console.error("notificacoes: falha ao apagar", e);
    return erro("Não consegui apagar agora.", 500);
  }
}
