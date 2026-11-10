import { erro, logada, MSG_SENHA } from "@/lib/api-auth";
import { estadoDaSenhaTemporaria } from "@/lib/contas";
import { db } from "@/lib/db";
import { SENHA_MAX, SENHA_MIN, senhaValida } from "@/lib/entrada";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Primeiro acesso: troca a senha temporária pela definitiva (o Supabase guarda só o hash bcrypt).
 * Só vale enquanto a senha temporária estiver pendente e no prazo (24 h), para que um token roubado não sirva para
 * trocar a senha de quem já definiu a sua. A troca derruba as sessões abertas: a tela entra de
 * novo com a senha nova (src/components/app/definir-senha.tsx).
 */
export async function POST(req: Request) {
  const auth = await logada(req, "senha", "Faça login.");
  if (auth instanceof Response) return auth;
  const senha = (await req.json().catch(() => null))?.senha;
  if (!senhaValida(senha))
    return erro(`A senha precisa ter de ${SENHA_MIN} a ${SENHA_MAX} caracteres.`, 400);

  const estado = await estadoDaSenhaTemporaria(auth.userId);
  if (!estado) return erro("Sua senha já foi definida.", 403);
  if (estado === "expirada") return erro(MSG_SENHA.expirada, 403);

  const { error } = await createAdminClient().auth.admin.updateUserById(auth.userId, { password: senha });
  if (error?.code === "same_password") return erro("Escolha uma senha diferente da temporária.", 400);
  if (error?.code === "weak_password") return erro("Essa senha é fraca demais. Escolha outra.", 400);
  if (error) {
    console.error("senha: falha ao trocar", error);
    return erro("Não consegui salvar sua senha agora. Tente de novo.", 500);
  }
  await db()`delete from public.senhas_temporarias where user_id = ${auth.userId}`;
  return new Response(null, { status: 204 });
}
