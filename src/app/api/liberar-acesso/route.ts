import { admin, erro } from "@/lib/api-auth";
import { emailsDoTexto } from "@/lib/alunas-curso";
import { criarConta } from "@/lib/contas";
import { enviarEmailDeAcesso } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Por chamada: a tela manda em lotes, para caber nos 60 s da função. */
const MAX_POR_VEZ = 25;

type Resultado = { email: string; status: "conta_criada" | "ja_tinha_conta" | "erro"; erro?: string };

/**
 * Liberação manual (só admin), 2026-11-12: para quem pagou e não recebeu o acesso.
 * Para cada e-mail faz o mesmo que o webhook da Applyfy: cria a conta (ou gera outra senha
 * temporária, se a aluna ainda não trocou) e manda o e-mail de acesso. `combo` escolhe o texto.
 * A senha nunca volta na resposta.
 */
export async function POST(req: Request) {
  const auth = await admin(req, "liberar-acesso");
  if (auth instanceof Response) return auth;
  const body = await req.json().catch(() => null);
  const emails = emailsDoTexto(typeof body?.texto === "string" ? body.texto.slice(0, 50_000) : "");
  const combo = body?.combo === true;
  if (!emails.length) return erro("Nenhum e-mail encontrado no texto.", 400);
  if (emails.length > MAX_POR_VEZ) return erro(`No máximo ${MAX_POR_VEZ} e-mails por vez.`, 400);

  const resultados: Resultado[] = [];
  // Um de cada vez: a Resend limita pedidos por segundo.
  for (const email of emails) {
    try {
      const r = await criarConta(email);
      await enviarEmailDeAcesso({ email, nome: null, senhaTemporaria: r === "existe" ? null : r.senhaTemporaria, combo });
      resultados.push({ email, status: r === "existe" ? "ja_tinha_conta" : "conta_criada" });
    } catch (e) {
      console.error("liberar-acesso: falha", { email, erro: (e as Error).message });
      resultados.push({ email, status: "erro", erro: "Não consegui liberar agora." });
    }
  }
  return Response.json({ resultados });
}
