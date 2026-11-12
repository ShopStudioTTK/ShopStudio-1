import "server-only";
import { VALIDADE_SENHA_TEMPORARIA_MIN } from "@/lib/contas";

/**
 * E-mail de acesso enviado depois da compra, pela API da Resend (RESEND_API_KEY), com o
 * remetente EMAIL_REMETENTE (domínio verificado na Resend) e o link SITE_URL/entrar.
 *
 * Dois textos, na voz da Ana (2026-11-12):
 * - `combo: false`: já é aluna do curso e comprou só o Shop Studio;
 * - `combo: true`: entrou agora, com o curso + Shop Studio.
 * Com `senhaTemporaria`, leva e-mail + senha do primeiro acesso; sem ela (a aluna já tinha
 * definido a própria senha), troca o bloco da senha por "entra com a senha que você criou".
 * Os erros nunca carregam a senha: só o status e a resposta da Resend.
 */
type Acesso = { email: string; nome: string | null; senhaTemporaria: string | null; combo?: boolean };

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

/** Blocos do e-mail: parágrafo, dados de acesso ou o aviso do prazo. */
type Bloco = { tipo: "p"; texto: string } | { tipo: "dados"; itens: [string, string][] } | { tipo: "aviso"; texto: string };

const textos = (combo: boolean) =>
  combo
    ? {
        assunto: "agora você é oficialmente uma shop girl!!! 🩷",
        abertura: "seja muito bem-vinda!!! 🥹🩷",
        corpo:
          "agora você é oficialmente uma shop girl e eu tô muito feliz que você decidiu não deixar pra janeiro. no Shop Club eu vou te ensinar o caminho desde o comecinho, e o Shop Studio vai te ajudar na hora de criar os vídeos, com meus ganchos, meus roteiros e a IA que eu treinei com o meu jeito de criar.",
        antesDosDados: "aqui tá seu acesso ao Shop Studio:",
        chamado: "amiga",
        fim: "e não precisa saber tudo pra começar não, viu? vai no seu tempo, pergunta no grupo, a gente tá junto nessa kkkkk",
      }
    : {
        assunto: "shop girl, seu Shop Studio chegou!!! 🩷",
        abertura: "que felicidade!!! 🥹🩷",
        corpo:
          "você já é shop girl e agora tem o Shop Studio também. sabe quando você tá com o produto na mão e pensa “tá, mas o que eu falo nesse vídeo?” kkkkk então, amiga, acabou isso! agora você tem meus ganchos, meus roteiros e a IA que eu treinei com o meu jeito de criar, tudo num lugar só.",
        antesDosDados: "olha seus dados pra entrar:",
        chamado: "diva",
        fim: "agora quero ver você usando e me contando tudo no grupo kkkkk",
      };

export function montarEmailDeAcesso({ email, nome, senhaTemporaria, combo = false }: Acesso, link: string) {
  const t = textos(combo);
  const primeiro = nome?.trim() ? nome.trim().split(/\s+/)[0] : "";
  const blocos: Bloco[] = [
    { tipo: "p", texto: `aaaai ${primeiro || "amiga"}, ${t.abertura}` },
    { tipo: "p", texto: t.corpo },
  ];
  if (senhaTemporaria) {
    blocos.push(
      { tipo: "p", texto: t.antesDosDados },
      { tipo: "dados", itens: [["link", link], ["e-mail", email], ["senha temporária", senhaTemporaria]] },
      {
        tipo: "aviso",
        texto: `ó, presta atenção nisso, ${t.chamado}: essa senha só vale ${prazo(VALIDADE_SENHA_TEMPORARIA_MIN)}! entra hoje mesmo, que no primeiro acesso o app já pede pra você criar sua senha nova. se passar do prazo ela expira e aí só falando com o suporte, tá?`,
      },
    );
  } else {
    // A conta já existia: ela entra com a senha que já criou.
    blocos.push(
      { tipo: "p", texto: "você já tem conta no app, então é só entrar com o seu e-mail e a senha que você criou:" },
      { tipo: "dados", itens: [["link", link], ["e-mail", email]] },
    );
  }
  blocos.push({ tipo: "p", texto: t.fim });

  const text = [
    ...blocos.map((b) => (b.tipo === "dados" ? b.itens.map(([r, v]) => `✨ ${r}: ${v}`).join("\n") : b.texto)),
    "um beijo,\nAna 🩷",
  ].join("\n\n");

  const P = "margin:0 0 18px;font-size:16px;line-height:1.6;color:#311D16";
  const corpoHtml = blocos
    .map((b) => {
      if (b.tipo === "p") return `<p style="${P}">${escapar(b.texto)}</p>`;
      if (b.tipo === "aviso")
        return `<p style="margin:0 0 18px;padding:14px 16px;border-radius:14px;background:#F8D3D8;font-size:15px;line-height:1.55;color:#311D16">${escapar(b.texto)}</p>`;
      const linhas = b.itens
        .map(([r, v]) => {
          const valor = escapar(v);
          const conteudo =
            r === "link"
              ? `<a href="${valor}" style="color:#B8515F;font-weight:bold">${valor}</a>`
              : `<span style="font-family:Menlo,Consolas,monospace;font-size:16px;font-weight:bold">${valor}</span>`;
          return `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#311D16">✨ ${escapar(r)}: ${conteudo}</p>`;
        })
        .join("");
      return `<div style="margin:0 0 18px;padding:16px 18px;border:1px solid #F0C7CD;border-radius:16px;background:#FFF8F9">${linhas}</div>`;
    })
    .join("");
  const botao = `<p style="margin:0 0 22px;text-align:center"><a href="${escapar(link)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#B8515F;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">entrar no Shop Studio</a></p>`;
  const html = `<div style="margin:0;padding:24px 12px;background:#F8EDEE;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:28px 24px;border-radius:24px;background:#ffffff">
<p style="margin:0 0 22px;font-size:22px;font-weight:bold;letter-spacing:-0.5px;color:#311D16">shop studio <span style="color:#B8515F">🩷</span></p>
${corpoHtml}${botao}
<p style="margin:0;font-size:16px;line-height:1.6;color:#311D16">um beijo,<br>Ana 🩷</p>
</div></div>`;
  return { subject: t.assunto, text, html };
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
