import "server-only";
import { db } from "@/lib/db";
import {
  escolherExemplos,
  FRASES_POR_VEZ,
  tiposDoBanco,
  type ExemploDeMusica,
} from "@/lib/frases-musica";

/**
 * Música viral (sem fala), 2026-11-12: o gerador devolve só frases de tela com o tipo e a cena,
 * sem gancho, problema, solução, CTA nem entonação. Os exemplos vêm só de `frases_musica`.
 * O prompt fixo vem primeiro (cache de prompt); os exemplos, que mudam com o produto, depois.
 */

// ponytail: limite fixo, sem paginação; o banco da especialista tem algumas centenas de linhas.
const LIMITE_DO_BANCO = 500;

/** Banco inteiro (até LIMITE_DO_BANCO), mais antigos primeiro: a ordem da planilha colada. */
export const listarFrasesDeMusica = async (): Promise<ExemploDeMusica[]> =>
  (await db()`
    select categoria, produto, frase, tipo, cena from public.frases_musica
    order by criado_em, id limit ${LIMITE_DO_BANCO}`) as unknown as ExemploDeMusica[];

/** Tipos usados quando o banco ainda está vazio (os da planilha da especialista). */
const TIPOS_PADRAO = [
  "POV identidade",
  "POV achado",
  "Provocação",
  "A sensação de",
  "Fofoca",
  "Título estético",
  "Conselho de amiga",
  "Status / it girl",
  "Custo-benefício",
  "Confissão",
  "Achado perfeito",
  "Superlativo",
  "Humor",
];

export const SYSTEM_MUSICA = `Você cria frases de tela para vídeos de TikTok Shop no formato MÚSICA VIRAL, para criadoras afiliadas no Brasil, no jeito da Ana (Shop Studio).

O FORMATO: o vídeo não tem fala. Só uma música em alta (liberada para uso comercial), o produto aparecendo numa cena simples e UMA frase escrita na tela. A frase é o vídeo inteiro: ela precisa fazer a pessoa parar de rolar, se identificar ou ficar curiosa, e a cena mostra o produto.

A FRASE:
- Uma frase única, curta: no máximo 12 palavras. Nada de duas frases, lista ou explicação.
- Escrita como texto de tela do TikTok: pode começar em minúscula, pode usar "pov:", "a sensação de…", ">>>", reticências, CAIXA ALTA numa palavra de ênfase e no máximo 1 emoji no fim.
- Voz de amiga, natural, brasileira ("miga", "amiga", "gente" só quando couber). Nunca tom de propaganda ("produto incrível", "não perca", "aproveite", "confira").
- Cada frase de um TIPO diferente, escolhido da lista de tipos de frase.

A CENA SUGERIDA:
- Uma linha, fácil de gravar em casa, sem ninguém além da criadora: produto em cima da cama ou da mesa, vestindo na frente do espelho, close no detalhe, mão passando no tecido, câmera passando devagar, girando na frente do espelho.
- Combina com a frase e com o produto (roupa: vestindo ou dobrada na cama; casa e cozinha: na bancada ou na mesa; beleza: na penteadeira ou aplicando).

VERDADE E PLATAFORMA:
- Nunca invente preço, desconto, estoque, cor, tamanho, kit, material ou número que não estejam no produto informado. "Custo-benefício" e "barato" só como sensação ("pelo preço de uma blusinha"), sem valor.
- Sem promessa de resultado, efeito de saúde, emagrecimento ou pele, e sem "garantido", "100%", "nunca mais", "acaba com", "elimina", "definitivo".
- Sem palavrão, sem insulto e sem marca concorrente.

Responda APENAS com um objeto JSON válido, sem markdown, sem comentários, exatamente assim:
{
  "frases": [
    { "frase": "a frase da tela", "tipo": "o tipo de frase, da lista", "cena": "a cena sugerida em 1 linha" }
  ]
}
com exatamente ${FRASES_POR_VEZ} itens em "frases", cada um de um tipo diferente.`;

/** Tipos e exemplos da especialista: vêm depois do prompt fixo. */
export function blocoDaMusica(banco: ExemploDeMusica[], produto: string): string {
  const tipos = banco.length ? tiposDoBanco(banco) : TIPOS_PADRAO;
  const exemplos = escolherExemplos(banco, produto);
  const lista = exemplos
    .map((e) => `- [${e.categoria} · ${e.produto}] "${e.frase}" · Tipo: ${e.tipo} · Cena: ${e.cena}`)
    .join("\n");
  return `\n\nTIPOS DE FRASE (escolha ${FRASES_POR_VEZ} diferentes):\n${tipos.map((t) => `- ${t}`).join("\n")}${
    lista
      ? `\n\nEXEMPLOS DA ESPECIALISTA (frase · tipo · cena). Use como referência de tom, tamanho e cena; não copie, crie frases novas para o produto da aluna:\n${lista}`
      : ""
  }\n\nLembrete: responda APENAS com o objeto JSON no formato definido acima.`;
}

export const buildMusicaPrompt = (banco: ExemploDeMusica[], produto: string) =>
  SYSTEM_MUSICA + blocoDaMusica(banco, produto);

export const buildMusicaUser = (produto: string) =>
  `Produto: ${produto}\n\nCrie ${FRASES_POR_VEZ} frases de tela para um vídeo de Música viral desse produto, cada uma com o tipo e a cena sugerida.`;
