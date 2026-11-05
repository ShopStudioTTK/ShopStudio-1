import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

/** Por quanto tempo a senha temporária vale, a partir de quando foi gerada. */
export const VALIDADE_SENHA_TEMPORARIA_MIN = 30;

// 12 bytes = 16 caracteres base64url, ~96 bits de entropia.
const novaSenha = () => randomBytes(12).toString("base64url");

/**
 * Cria a conta de uma aluna que comprou: usuário com e-mail confirmado e senha temporária,
 * marcado em `senhas_temporarias` (a troca é obrigatória no primeiro acesso) e com o acesso já
 * liberado. Devolve a senha temporária para quem chamou entregá-la à aluna.
 *
 * Se o e-mail já existe e a senha ainda é temporária (expirada ou não), gera outra e renova o
 * prazo. Se a aluna já definiu a sua senha, devolve "existe" e não muda nada.
 */
export async function criarConta(email: string): Promise<{ senhaTemporaria: string } | "existe"> {
  const senhaTemporaria = novaSenha();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: senhaTemporaria, email_confirm: true });
  if (error?.code === "email_exists") return renovarSenhaTemporaria(email);
  if (error || !data.user) throw new Error(`não consegui criar a conta: ${error?.message ?? "sem usuário"}`);

  const userId = data.user.id;
  try {
    // Uma consulta só: ou grava a marca e o acesso juntos, ou nenhum dos dois.
    await db()`
      with marca as (insert into public.senhas_temporarias (user_id) values (${userId}))
      insert into public.entitlements (user_id, origem) values (${userId}, 'compra')`;
  } catch (e) {
    // Sem a marca, a senha temporária viraria definitiva: melhor não deixar a conta existir.
    await admin.auth.admin.deleteUser(userId);
    throw e;
  }
  return { senhaTemporaria };
}

async function renovarSenhaTemporaria(email: string): Promise<{ senhaTemporaria: string } | "existe"> {
  const [pendente] = await db()`
    select s.user_id from public.senhas_temporarias s
    join auth.users u on u.id = s.user_id
    where u.email = ${email}`;
  if (!pendente) return "existe";

  const senhaTemporaria = novaSenha();
  const { error } = await createAdminClient().auth.admin.updateUserById(pendente.user_id, { password: senhaTemporaria });
  if (error) throw new Error(`não consegui gerar outra senha: ${error.message}`);
  await db()`update public.senhas_temporarias set criada_em = now() where user_id = ${pendente.user_id}`;
  return { senhaTemporaria };
}

/**
 * Situação da senha temporária da conta: "pendente" (ainda no prazo), "expirada" ou null (já
 * trocada). Só o servidor sabe: nada disso vai no JWT nem nos metadados do usuário.
 */
export async function estadoDaSenhaTemporaria(userId: string): Promise<"pendente" | "expirada" | null> {
  const [linha] = await db()`
    select criada_em > now() - make_interval(mins => ${VALIDADE_SENHA_TEMPORARIA_MIN}) as valida
    from public.senhas_temporarias where user_id = ${userId}`;
  if (!linha) return null;
  return linha.valida ? "pendente" : "expirada";
}
