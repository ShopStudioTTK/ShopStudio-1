export const DESAFIO_MARCA = "@shopstudio";

export type DesafioDia = {
  dia: number;
  titulo: string;
  tarefa: string;
  post: string;
};

export const desafioDias: DesafioDia[] = [
  {
    dia: 1,
    titulo: "Escolha 3 produtos",
    tarefa:
      "Passe pelo checklist da curadoria (capítulo 8) em 3 produtos que você já tem em casa: avaliações boas, estoque, comissão que valha e testado por você.",
    post: "Grave um vídeo curto mostrando os 3 na mão: “os 3 achados que eu vou testar essa semana”.",
  },
  {
    dia: 2,
    titulo: "Escreva antes de gravar",
    tarefa:
      "Para 1 desses produtos, escreva 5 ganchos (use o Banco de ganchos), 5 problemas, 5 soluções e 5 CTAs.",
    post: "Grave 2 versões do mesmo gancho, uma mais calma e uma mais acelerada. Poste a que te deixou menos desconfortável.",
  },
  {
    dia: 3,
    titulo: "Estrutura completa",
    tarefa:
      "Monte 3 vídeos de 30 a 60 segundos com gancho, problema, solução e CTA. Nada de introdução: comece pela frase que faz parar.",
    post: "Publique os 3 ao longo do dia. Um deles vai render mais — e é esse que você vai repetir na semana 2.",
  },
  {
    dia: 4,
    titulo: "Troque o formato",
    tarefa:
      "Escolha o produto que mais te deu retorno até aqui e grave em outro formato: unboxing, tela verde ou storytelling.",
    post: "Poste e observe se o formato novo segura mais gente nos 3 primeiros segundos.",
  },
  {
    dia: 5,
    titulo: "Vídeo de resposta",
    tarefa:
      "Pegue um comentário real (dúvida ou crítica) e transforme em vídeo: mostre o produto respondendo àquilo.",
    post: "Use a função de responder comentário com vídeo. Quem comentou volta, e o algoritmo entende que o vídeo gera conversa.",
  },
  {
    dia: 6,
    titulo: "Estude seu top 3",
    tarefa:
      "Abra Central do Criador → Vídeos e filtre por itens vendidos. Anote o que os 3 melhores têm em comum: gancho, produto, música, texto na tela.",
    post: "Grave a versão 2.0 do seu melhor vídeo, com o mesmo gancho e outro produto.",
  },
  {
    dia: 7,
    titulo: "Feche a semana",
    tarefa:
      "Coloque o link certo em todos os vídeos da semana (Central do Criador → Vincular links), com nome de link claro.",
    post: "Publique o vídeo que mais funcionou de novo, com outro gancho, e marque o Shop Studio no vídeo e nos stories.",
  },
];

export const desafioLegenda =
  `Semana 1 do desafio: 7 dias, 1 vídeo por dia. Cada vídeo é um teste, não um show. ` +
  `Marque ${DESAFIO_MARCA} e use #tiktokshop para eu acompanhar os resultados.`;
