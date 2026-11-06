import "server-only";
import { VALIDADE_SENHA_TEMPORARIA_MIN } from "@/lib/contas";

/**
 * E-mail de acesso enviado depois da compra, pela API da Resend (RESEND_API_KEY), com o
 * remetente EMAIL_REMETENTE (domínio verificado na Resend) e o link SITE_URL/entrar.
 * Com `senhaTemporaria`, leva e-mail + senha do primeiro acesso; sem ela (a aluna já tinha
 * definido a própria senha), só avisa que o acesso está liberado.
 * Os erros nunca carregam a senha: só o status e a resposta da Resend.
 */
type Acesso = { email: string; nome: string | null; senhaTemporaria: string | null };

const config = () => {
  const faltando = ["RESEND_API_KEY", "EMAIL_REMETENTE", "SITE_URL"].filter((n) => !process.env[n]);
  if (faltando.length) throw new Error(`e-mail não configurado: ${faltando.join(", ")}`);
  return {
    chave: process.env.RESEND_API_KEY!,
    remetente: process.env.EMAIL_REMETENTE!,
    link: `${process.env.SITE_URL!.replace(/\/+$/, "")}/entrar`,
  };
};

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const prazo = (min: number) =>
  min % 60 === 0 ? `${min / 60} ${min === 60 ? "hora" : "horas"}` : `${min} minutos`;

export function montarEmailDeAcesso({ email, nome, senhaTemporaria }: Acesso, link: string) {
  const ola = nome?.trim() ? `Olá, ${nome.trim().split(/\s+/)[0]}!` : "Olá!";
  const linhas = senhaTemporaria
    ? [
        ola,
        "Sua compra foi confirmada e o seu acesso ao Shop Studio já está liberado.",
        `Link: ${link}`,
        `E-mail: ${email}`,
        `Senha temporária: ${senhaTemporaria}`,
        `No primeiro acesso você vai criar a sua senha. A senha temporária vale ${prazo(VALIDADE_SENHA_TEMPORARIA_MIN)}; se ela expirar, fale com o suporte do Shop Studio.`,
      ]
    : [
        ola,
        "Sua compra foi confirmada e o seu acesso ao Shop Studio continua liberado.",
        `Link: ${link}`,
        `Entre com o e-mail ${email} e a senha que você criou.`,
      ];
  const text = linhas.join("\n\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#222">${linhas
    .map((l) => {
      const [rotulo, ...resto] = l.split(": ");
      if (["Link", "E-mail", "Senha temporária"].includes(rotulo) && resto.length) {
        const valor = escapar(resto.join(": "));
        const conteudo = rotulo === "Link" ? `<a href="${valor}">${valor}</a>` : `<code style="font-size:16px">${valor}</code>`;
        return `<p style="margin:4px 0"><strong>${rotulo}:</strong> ${conteudo}</p>`;
      }
      return `<p>${escapar(l)}</p>`;
    })
    .join("")}</div>`;
  return { subject: "Seu acesso ao Shop Studio", text, html };
}

export async function enviarEmailDeAcesso(acesso: Acesso): Promise<void> {
  const { chave, remetente, link } = config();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente, to: [acesso.email], ...montarEmailDeAcesso(acesso, link) }),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
}
