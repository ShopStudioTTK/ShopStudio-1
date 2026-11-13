/**
 * Ofertas da página de vendas (/checkout). Sem segredo: preço e texto são públicos.
 * Os links vêm das variáveis NEXT_PUBLIC_CHECKOUT_* (checkouts da Applyfy).
 */
export type Oferta = { id: "ferramenta" | "combo"; nome: string; preco: string; resumo: string; inclui: string[]; url: string };

export const OFERTA_FERRAMENTA: Oferta = {
  id: "ferramenta",
  nome: "Shop Studio",
  preco: "R$ 197",
  resumo: "Só a ferramenta, para quem já é aluna do curso.",
  inclui: ["Gerador de roteiros com o método da Ana", "Assistente de IA para tirar dúvidas", "Roteiros expert para se inspirar", "1 ano de acesso"],
  url: process.env.NEXT_PUBLIC_CHECKOUT_FERRAMENTA_URL ?? "",
};

export const OFERTA_COMBO: Oferta = {
  id: "combo",
  nome: "Curso + Shop Studio",
  preco: "R$ 247",
  resumo: "O curso completo e a ferramenta juntos.",
  inclui: ["Tudo do Shop Studio", "O curso completo, do zero à primeira venda", "Acesso às duas áreas com o mesmo e-mail", "1 ano de acesso"],
  url: process.env.NEXT_PUBLIC_CHECKOUT_COMBO_URL ?? "",
};

export const BENEFICIOS = [
  { emoji: "🎬", titulo: "Roteiro em segundos", texto: "Gancho, problema, solução e CTA prontos para gravar, no jeito que vende no TikTok Shop." },
  { emoji: "🎵", titulo: "Música viral sem fala", texto: "Frases de tela e a cena para gravar em casa, para quem não quer aparecer falando." },
  { emoji: "💬", titulo: "Assistente que entende de TikTok Shop", texto: "Tire dúvidas de conta, produto, comissão e vídeo a qualquer hora." },
];

export const PERGUNTAS = [
  { p: "Como recebo o acesso?", r: "Logo depois do pagamento aprovado, chega no seu e-mail o link do app, o seu e-mail de acesso e uma senha temporária." },
  { p: "Funciona no celular?", r: "Sim. O Shop Studio abre no navegador do celular e dá para instalar na tela inicial, como um app." },
  { p: "Já sou aluna do curso. Preciso comprar o combo?", r: "Não. Quem já é aluna pode levar só a ferramenta, por R$ 197." },
];
