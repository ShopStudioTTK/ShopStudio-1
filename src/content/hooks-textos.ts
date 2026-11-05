import "server-only";
import type { Gancho, HookCategoria } from "./hooks";

// Banco de ganchos: conteúdo pago, só no servidor (ver protegido.ts).
const quebra: string[] = [
  "O dinheiro que eu já joguei fora com [PRODUTO]…",
  "Vou falar uma coisa que muita gente não vai gostar…",
  "Eu quase joguei isso no lixo. SÉRIO.",
  "Acho que fiz a pior compra da minha vida…",
  "Isso aqui é tão simples que chega a ser ridículo.",
  "Quem inventou isso merece um prêmio.",
  "Me recuso a continuar pagando caro por [PRODUTO].",
  "Eu tinha CERTEZA que isso era propaganda enganosa.",
  "Isso aqui tem preço de [VALOR], mas aparência de [VALOR MAIOR].",
  "Você tá gastando dinheiro à toa com [PRODUTO].",
  "Motivos pelos quais eu ODEIO [PRODUTO]…",
  "Eu tô simplesmente CHOCADA com isso aqui.",
  "Como ninguém pensou nisso antes?",
  "Você provavelmente tá fazendo [AÇÃO] errado.",
  "NÃO compra [PRODUTO] antes de ver isso.",
  "Isso aqui não tinha o direito de ser TÃO bom.",
  "A compra mais sem noção que eu já fiz…",
  "Me julguem, mas eu prefiro isso aqui do que [ALTERNATIVA].",
  "Eu paguei [VALOR] nisso aqui. E faria de novo.",
  "Eu achei que não precisava disso. QUEBREI A CARA.",
];

const problema: string[] = [
  "Se você sofre com [PROBLEMA], esse vídeo é pra você.",
  "Cansada de [PROBLEMA]? Olha isso aqui.",
  "Só quem passa por [SITUAÇÃO] vai entender…",
  "Se você tem [PROBLEMA], precisa saber disso.",
  "Você também passa raiva com [SITUAÇÃO]?",
  "Se você ainda faz [AÇÃO] desse jeito, tá na hora de mudar.",
  "Odeia quando [SITUAÇÃO]? Então olha isso.",
  "Se você tem [PROBLEMA], presta atenção nisso aqui.",
  "Quem tem [PROBLEMA] sabe o quanto isso incomoda.",
  "Você também perde tempo tentando [AÇÃO]?",
  "O pior de [SITUAÇÃO] é ter que lidar com isso…",
  "Se você também não aguenta mais [PROBLEMA], olha isso.",
  "Quantas vezes você já passou por [SITUAÇÃO]?",
  "Se [PROBLEMA] te incomoda, você precisa ver isso.",
  "Você ainda sofre pra conseguir [RESULTADO]?",
  "Quem nunca passou raiva tentando [AÇÃO]?",
  "Se toda vez que você [AÇÃO] acontece isso, olha aqui.",
  "Ninguém merece ter que lidar com [PROBLEMA].",
  "Se você também tem dificuldade pra [AÇÃO], vem cá.",
  "Se você pudesse acabar com [PROBLEMA], acabaria?",
];

const curiosidade: string[] = [
  "Tá, agora eu entendi por que todo mundo tá comprando isso…",
  "Eu não queria falar sobre isso, mas…",
  "Como assim ninguém tá falando sobre isso aqui?",
  "Não é à toa que isso aqui vive esgotado…",
  "Eu achei que era besteira até descobrir isso.",
  "Alguém me explica por que eu demorei tanto pra comprar isso?",
  "Isso aqui parece MUITO mais caro do que realmente é.",
  "Eu não sei quem inventou isso, mas obrigada.",
  "Eu achei que todo mundo já sabia disso, mas aparentemente não…",
  "Eu preciso mostrar uma coisa pra vocês…",
  "Se você ainda compra [PRODUTO] desse jeito, olha isso.",
  "Eu tava procurando uma coisa e encontrei outra MUITO melhor.",
  "Agora eu entendi o motivo de tanto sucesso…",
  "Eu achei que isso só existia na gringa.",
  "Eu não dava nada por isso aqui, até testar.",
  "Acho que encontrei a melhor compra do ano.",
  "Não compra [PRODUTO] antes de ver isso aqui.",
  "Eu tenho uma teoria sobre isso aqui…",
  "O que ninguém te conta sobre [PRODUTO]…",
  "Eu duvido você olhar isso aqui e não querer um também.",
];

const build = (categoria: HookCategoria, textos: string[]): Gancho[] =>
  textos.map((texto, index) => ({ id: `${categoria}-${index + 1}`, categoria, texto }));

export const ganchos: Gancho[] = [
  ...build("quebra", quebra),
  ...build("problema", problema),
  ...build("curiosidade", curiosidade),
];
