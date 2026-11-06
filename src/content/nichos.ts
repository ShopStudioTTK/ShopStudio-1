/**
 * Abas da tela de Campeões. Cada uma faz as `buscas` na Brave (com `site:tiktok.com` na frente) e
 * fica com os vídeos que citam alguma das `palavras` (sem acento, em minúsculas) e têm sinal de venda.
 * Testados em 2026-11-06 (DEVLOG): cada aba junta de 40 a 55 vídeos. Sem segredo: a tela usa o rótulo.
 */
export type Nicho = { slug: string; rotulo: string; buscas: string[]; palavras: string[] };

export const NICHOS: Nicho[] = [
  {
    slug: "moda-fitness",
    rotulo: "Moda fitness",
    buscas: [
      'legging fitness (achadinho OR comprei OR "tiktok shop")',
      "conjunto fitness feminino (achadinho OR comprei OR provador)",
      'roupa academia feminina (achadinho OR shopee OR "vale a pena")',
    ],
    palavras: ["legging", "fitness", "academia", "treino", "conjunto"],
  },
  {
    slug: "beleza",
    rotulo: "Beleza",
    buscas: [
      "maquiagem (achadinho OR comprei OR resenha)",
      'skincare (achadinho OR comprei OR "vale a pena")',
      "cabelo produto (achadinho OR testei OR resenha)",
    ],
    palavras: ["maquiagem", "make", "skincare", "pele", "cabelo", "batom", "serum", "perfume", "hidratante", "rimel", "protetor"],
  },
  {
    slug: "maternidade",
    rotulo: "Maternidade",
    buscas: [
      "achadinhos bebê (enxoval OR maternidade OR comprei)",
      "gestante (achadinho OR comprei OR enxoval)",
      'mãe de primeira viagem (achadinho OR comprei OR "vale a pena")',
    ],
    // "mãe" sozinha puxava vídeo de viagem em família
    palavras: ["bebe", "maternidade", "gestante", "gravida", "enxoval", "recem"],
  },
  {
    slug: "casa-e-cozinha",
    rotulo: "Casa e cozinha",
    buscas: [
      "achadinhos casa (cozinha OR organização OR comprei)",
      'utensílios cozinha (achadinho OR comprei OR "vale a pena")',
      "organização casa (achadinho OR comprei OR shopee)",
    ],
    palavras: ["casa", "cozinha", "organiza", "utensilio", "limpeza", "decor"],
  },
  {
    slug: "moda-feminina",
    rotulo: "Moda feminina",
    buscas: [
      "look feminino (achadinho OR comprei OR provador)",
      'vestido (achadinho OR comprei OR "tiktok shop")',
      'roupa feminina (shein OR shopee OR "tiktok shop") provador',
    ],
    palavras: ["vestido", "look", "roupa", "blusa", "saia", "cropped", "calca", "bolsa", "moda", "sandalia", "provador"],
  },
];
