import type { Chapter } from "./types";

export type { Chapter, Block, CalloutVariant, ChecklistItem, ConteudoProtegido } from "./types";

// Só o índice vai para o navegador. O corpo de cada capítulo fica no servidor (protegido.ts)
// e é entregue por /api/conteudo/capitulos/<slug>, só para quem está logada e tem acesso.
export const chapters: Chapter[] = [
  {
    slug: "mentalidade-de-shop-girl",
    number: 1,
    title: "Mentalidade de Shop Girl",
    subtitle: "As verdades que ninguém gosta de escutar",
    summary:
      "Antes de qualquer estratégia, o que separa quem vende de quem desiste é a forma de encarar o processo.",
    readingMinutes: 4,
  },
  {
    slug: "entendendo-o-tiktok-shop",
    number: 2,
    title: "Entendendo o TikTok Shop",
    subtitle: "Um shopping dentro de uma rede social",
    summary: "Como funciona, quem faz o quê e como você ganha dinheiro na plataforma.",
    readingMinutes: 5,
  },
  {
    slug: "ativando-sua-conta-de-afiliada",
    number: 3,
    title: "Ativando sua conta de afiliada",
    subtitle: "Requisitos e passo a passo",
    summary: "É mais rápido do que parece. Comece com uma conta só e coloque toda a sua energia nela.",
    readingMinutes: 5,
  },
  {
    slug: "seus-primeiros-2-mil-seguidores",
    number: 4,
    title: "Seus primeiros 2 mil seguidores",
    subtitle: "Caminhos orgânicos e acelerados",
    summary: "Isso é só a ponta do iceberg. Com constância, vira o menor dos seus problemas.",
    readingMinutes: 5,
  },
  {
    slug: "a-central-do-criador-por-dentro",
    number: 5,
    title: "A Central do Criador por dentro",
    subtitle: "Sua área de trabalho, botão por botão",
    summary: "Pense nela como o escritório e a carteira da sua empresa.",
    readingMinutes: 6,
  },
  {
    slug: "seu-link-de-afiliada-no-video",
    number: 6,
    title: "Seu link de afiliada no vídeo",
    subtitle: "Da vitrine à publicação",
    summary: "É a sacolinha que transforma visualização em comissão.",
    readingMinutes: 5,
  },
  {
    slug: "nichar-ou-nao-nichar",
    number: 7,
    title: "Nichar ou não nichar?",
    subtitle: "Venda o que você acredita",
    summary: "Não é regra. É decisão estratégica. O que importa mesmo é acreditar no que você vende.",
    readingMinutes: 4,
  },
  {
    slug: "como-encontrar-produtos-campeoes",
    number: 8,
    title: "Como encontrar produtos campeões",
    subtitle: "Critérios, ticket e sazonalidade",
    summary: "Não existe produto mágico. Existe um processo de curadoria que você repete sempre.",
    readingMinutes: 7,
  },
  {
    slug: "amostras-sem-depender-delas",
    number: 9,
    title: "Amostras sem depender delas",
    subtitle: "Comece com o que você já tem",
    summary: "Você tem muito mais produto em casa do que imagina.",
    readingMinutes: 6,
  },
  {
    slug: "a-estrutura-dos-videos-que-vendem",
    number: 10,
    title: "A estrutura dos vídeos que vendem",
    subtitle: "Gancho, problema, solução e CTA",
    summary: "Se fosse para ler um único capítulo, seria este. É o coração de qualquer conteúdo.",
    readingMinutes: 8,
  },
  {
    slug: "formatos-gravacao-e-edicao",
    number: 11,
    title: "Formatos, gravação e edição",
    subtitle: "Arroz com feijão bem feito",
    summary: "TikTok Shop é arroz com feijão bem feito. Nada de efeitos especiais.",
    readingMinutes: 7,
  },
  {
    slug: "seu-plano-para-comecar",
    number: 12,
    title: "Seu plano para começar",
    subtitle: "Rotina, metas e checklist da semana 1",
    summary: "Constância e consistência. Sem isso, nenhuma estratégia funciona.",
    readingMinutes: 5,
  },
];

export const getChapter = (slug: string): Chapter | undefined =>
  chapters.find((chapter) => chapter.slug === slug);

export const getAdjacentChapters = (slug: string) => {
  const index = chapters.findIndex((chapter) => chapter.slug === slug);
  return {
    previous: index > 0 ? chapters[index - 1] : null,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null,
  };
};

export const chapterPath = (slug: string) => `/app/capitulos/${slug}`;

export const totalReadingMinutes = chapters.reduce(
  (total, chapter) => total + chapter.readingMinutes,
  0,
);
