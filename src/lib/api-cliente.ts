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
  const json = res.status === 204 || res.status === 201 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message ?? "Não consegui falar com o servidor. Tente de novo.");
  return json as T;
}
