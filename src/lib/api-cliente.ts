import { supabase } from "@/integrations/supabase/client";

/**
 * Chama uma rota do app com o token da sessão. É o único caminho do navegador até os dados:
 * ele não fala com o banco (a Data API do Supabase fica desligada). Do Supabase, o navegador
 * só usa o login (supabase.auth).
 */
export async function api<T = void>(caminho: string, opcoes: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sua sessão expirou. Entre de novo.");
  const comCorpo = opcoes.body !== undefined;
  const res = await fetch(caminho, {
    method: opcoes.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(comCorpo ? { "Content-Type": "application/json" } : {}) },
    body: comCorpo ? JSON.stringify(opcoes.body) : undefined,
  });
  // 401 = o servidor não aceita mais este token (conta apagada, senha trocada em outro aparelho).
  // Encerra a sessão local: a guarda manda para /entrar em vez de ficar presa no carregamento.
  // Só se o token recusado ainda for o atual: logo depois de trocar a senha a tela já entrou de novo.
  if (res.status === 401) {
    const atual = (await supabase.auth.getSession()).data.session?.access_token;
    if (atual === token) await supabase.auth.signOut({ scope: "local" });
    throw new Error("Sua sessão expirou. Entre de novo.");
  }
  // 201 pode vir com corpo (o que foi criado) ou vazio; sem corpo, json() falha e vira null.
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? "Não consegui falar com o servidor. Tente de novo.");
  return json as T;
}
