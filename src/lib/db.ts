import "server-only";
import postgres from "postgres";

/**
 * Conexão direta do servidor com o Postgres. O navegador NÃO fala com o banco (a Data API do
 * Supabase fica desligada): todo dado passa por uma rota em src/app/api, que confere o token.
 *
 * A conexão é do dono das tabelas e não passa pelo RLS. Por isso, toda consulta de dado de
 * aluna filtra por `user_id = ${userId}`, com o userId vindo de logada()/autenticar(), nunca do corpo.
 * Sempre use o template (`db()\`... ${valor}\``): os valores vão como parâmetros, sem SQL injection.
 *
 * ponytail: conecta como `postgres`; um papel próprio com só os grants necessários é o próximo passo.
 */
const global_ = globalThis as { conexaoDb?: postgres.Sql };

export const db = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não configurada.");
  // prepare: false porque, em produção, a conexão passa pelo pooler do Supabase (modo transação).
  return (global_.conexaoDb ??= postgres(url, { prepare: false, max: 5 }));
};
