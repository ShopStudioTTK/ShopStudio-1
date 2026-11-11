import { autenticar, erro } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { EMAIL, SENHA_MAX, SENHA_MIN, senhaValida, texto } from "@/lib/entrada";
import { nomeDoPerfil } from "@/lib/nome";
import { conferirSenha, createAdminClient } from "@/lib/supabase/admin";
import { perfilDoTiktok } from "@/lib/video";

export const runtime = "nodejs";

/** O que a tela não tem no token: o TikTok da aluna (fica em `profiles`, fora do JWT). */
export async function GET(req: Request) {
  const auth = await autenticar(req, "conta", "Faça login.");
  if (auth instanceof Response) return auth;
  const [perfil] = await db()`select tiktok from public.profiles where id = ${auth.userId}`;
  return Response.json({ tiktok: perfil?.tiktok ?? null });
}

/**
 * Configurações da aluna: nome, e-mail e senha, sempre da conta do token. E-mail e senha são o
 * login, então só mudam com a senha atual: um token roubado sozinho não toma a conta. O e-mail
 * novo entra já confirmado (os modelos de e-mail do Supabase não têm link). Trocar a senha
 * derruba as sessões abertas: a tela entra de novo (src/app/app/conta/page.tsx). O TikTok (link do
 * perfil, que o mural liga ao nome dela) só vai para `profiles`, sem senha: não é login.
 */
export async function PATCH(req: Request) {
  const auth = await autenticar(req, "conta", "Faça login.");
  if (auth instanceof Response) return auth;
  const { user, userId } = auth;
  const corpo = (await req.json().catch(() => null)) ?? {};

  const nome = corpo.nome === undefined ? undefined : texto(corpo.nome, 80);
  if (nome === null) return erro("Escreva seu nome.", 400);
  let email: string | undefined = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : undefined;
  if (email !== undefined && (email.length > 254 || !EMAIL.test(email))) return erro("E-mail inválido.", 400);
  if (email === user.email) email = undefined;
  const senha = corpo.senha;
  if (senha !== undefined && !senhaValida(senha))
    return erro(`A senha precisa ter de ${SENHA_MIN} a ${SENHA_MAX} caracteres.`, 400);
  // Vazio tira o link; outro valor precisa ser um perfil do TikTok.
  let tiktok: string | null | undefined;
  if (corpo.tiktok !== undefined) {
    const valor = typeof corpo.tiktok === "string" ? corpo.tiktok.trim() : "";
    tiktok = valor ? perfilDoTiktok(valor) : null;
    if (valor && !tiktok) return erro("Cole o link do seu perfil no TikTok (ou o @ do seu usuário).", 400);
  }
  if (nome === undefined && email === undefined && senha === undefined && tiktok === undefined)
    return erro("Nada para mudar.", 400);

  if (tiktok !== undefined) {
    await db()`
      insert into public.profiles (id, email, nome, tiktok)
      values (${userId}, ${user.email ?? null}, ${nomeDoPerfil(user.user_metadata)}, ${tiktok})
      on conflict (id) do update set tiktok = excluded.tiktok`;
    if (nome === undefined && email === undefined && senha === undefined) return new Response(null, { status: 204 });
  }

  if (email !== undefined || senha !== undefined) {
    const atual = corpo.senhaAtual;
    let conferida: Awaited<ReturnType<typeof conferirSenha>> = "errada";
    try {
      if (typeof atual === "string" && atual && user.email) conferida = await conferirSenha(user.email, atual);
    } catch (e) {
      console.error("conta: falha ao conferir a senha", e);
      return erro("Não consegui conferir sua senha agora. Tente de novo.", 500);
    }
    if (conferida === "limite") return erro("Muitas tentativas. Espere alguns minutos e tente de novo.", 429);
    if (conferida !== "ok") return erro("Sua senha atual não confere.", 403);
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    ...(nome !== undefined && { user_metadata: { full_name: nome } }),
    ...(email !== undefined && { email, email_confirm: true }),
    ...(senha !== undefined && { password: senha }),
  });
  if (error?.code === "email_exists") return erro("Esse e-mail já está em outra conta.", 409);
  if (error?.code === "same_password") return erro("Escolha uma senha diferente da atual.", 400);
  if (error?.code === "weak_password") return erro("Essa senha é fraca demais. Escolha outra.", 400);
  if (error) {
    console.error("conta: falha ao salvar", error);
    return erro("Não consegui salvar agora. Tente de novo.", 500);
  }

  // O perfil é só espelho do login: se falhar, a mudança já valeu e não vale assustar a aluna.
  try {
    await db()`
      insert into public.profiles (id, email, nome)
      values (${userId}, ${email ?? user.email ?? null}, ${nome ?? nomeDoPerfil(user.user_metadata)})
      on conflict (id) do update set email = excluded.email, nome = excluded.nome`;
  } catch (e) {
    console.error("conta: falha ao atualizar o perfil", e);
  }
  return new Response(null, { status: 204 });
}
