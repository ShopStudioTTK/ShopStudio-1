import "server-only";
import type { CorpoCapitulo } from "./types";

// Corpo dos capítulos: só no servidor, entregue por /api/conteudo (ver protegido.ts). O índice fica em chapters.ts.
export const chaptersPartOne: CorpoCapitulo[] = [
  {
    slug: "mentalidade-de-shop-girl",
    blocks: [
      {
        type: "p",
        text: "Começar algo novo dá frio na barriga, e isso é ótimo: é sinal de que você está saindo da zona de conforto. Para essa jornada dar certo, leve estes quatro acordos com você.",
      },
      {
        type: "cards",
        items: [
          {
            title: "Acordo 1 — Sem energia de coitada",
            text: "Quem se trata como coitada tem resultado de coitada. Troque o “não consigo” por “o que posso fazer hoje para melhorar?”.",
          },
          {
            title: "Acordo 2 — Desculpa não vende",
            text: "Vergonha, falta de tempo, não saber criar conteúdo: tudo isso é real, mas tem solução. Gravar dois vídeos sozinha no quarto já é melhor do que nenhum.",
          },
          {
            title: "Acordo 3 — É negócio, não hobby",
            text: "Quem trata como hobby ganha um dinheirinho. Quem trata como prioridade constrói uma fonte de renda.",
          },
          {
            title: "Acordo 4 — Não se compare",
            text: "Cada uma tem seu processo. Talvez seu primeiro mês seja R$ 1.000, R$ 150 ou zero. O que importa é continuar.",
          },
        ],
      },
      {
        type: "callout",
        variant: "lembre",
        title: "Lembre-se",
        text: "A plataforma não sabe se você está cansada, ansiosa ou tímida. Ela quer que você trabalhe. Você se levanta e vai, como em qualquer emprego.",
      },
      { type: "h3", text: "Por que vale a pena" },
      {
        type: "list",
        items: [
          "Você vende para o Brasil inteiro, de qualquer lugar.",
          "Não precisa ter estoque nem cuidar de envio, troca ou suporte.",
          "Não precisa convencer ninguém no privado: o vídeo faz o trabalho.",
          "Um vídeo antigo pode continuar vendendo por meses — efeito bola de neve.",
        ],
      },
    ],
  },
  {
    slug: "entendendo-o-tiktok-shop",
    blocks: [
      {
        type: "p",
        text: "As pessoas entram no TikTok para se divertir, não para comprar. No meio dos vídeos aparece o seu, mostrando um produto com uma sacolinha. Elas se interessam, clicam e compram ali mesmo. É essa mistura de entretenimento com compra rápida que faz o TikTok Shop vender tanto.",
      },
      {
        type: "steps",
        items: [
          {
            title: "Você se afilia a um produto",
            text: "que já existe na plataforma e o adiciona à sua vitrine.",
          },
          { title: "Grava um vídeo", text: "e coloca o link desse produto nele." },
          {
            title: "Alguém assiste, clica na sacolinha e compra",
            text: "sem sair do aplicativo.",
          },
          {
            title: "Você recebe a comissão automaticamente",
            text: "O TikTok paga semanalmente.",
          },
        ],
      },
      {
        type: "callout",
        variant: "ouro",
        title: "Seu único papel",
        text: "Vender. Envio, troca e suporte ficam com o vendedor. O foco aqui são vídeos: eles vendem mesmo quando você está off-line.",
      },
      { type: "h3", text: "Mini glossário" },
      {
        type: "cards",
        items: [
          {
            title: "GMV",
            text: "Valor bruto de todas as vendas geradas pelos seus vídeos.",
          },
          { title: "Vitrine", text: "A lista de produtos dos quais você é afiliada." },
          {
            title: "Central do Criador",
            text: "Sua área de trabalho: vendas, vídeos, amostras e ferramentas.",
          },
          {
            title: "Comissão",
            text: "O percentual que sobra para você a cada venda concluída, pago semanalmente.",
          },
        ],
      },
    ],
  },
  {
    slug: "ativando-sua-conta-de-afiliada",
    blocks: [
      { type: "h3", text: "O que você precisa ter" },
      {
        type: "list",
        items: [
          "Pelo menos 18 anos. Se você for menor, a conta e os dados bancários ficam no nome de um responsável e você produz o conteúdo.",
          "Um vídeo publicado nos últimos 180 dias.",
          "2 mil seguidores — o capítulo 4 mostra os caminhos.",
          "Diretrizes da comunidade lidas. Elas protegem a saúde da sua conta.",
        ],
      },
      {
        type: "steps",
        items: [
          {
            title: "Abra o seu perfil",
            text: "e toque nos três pontinhos no canto superior.",
          },
          { title: "Entre no TikTok Studio.", text: "" },
          {
            title: "Escolha “TikTok Shop para criadores”",
            text: "Não é “para vendedores”: essa opção é para quem tem produto próprio.",
          },
          {
            title: "Confira os requisitos e toque em aplicar.",
            text: "",
          },
          {
            title: "Preencha o formulário",
            text: "A aprovação pode levar até 48 h, mas costuma sair na hora.",
          },
        ],
      },
      {
        type: "callout",
        variant: "pratica",
        title: "Na prática",
        text: "1. Abra o TikTok e deixe o app atualizado. 2. Faça o cadastro na opção rosinha — “TikTok Shop para criadores”.",
      },
      { type: "h3", text: "Regras para não ser punida" },
      {
        type: "list",
        items: [
          "Seja neutra e honesta: nada de promessas milagrosas ou palavrões.",
          "Nunca mostre um produto diferente do que está no link.",
          "Comece com uma conta só: duas exigem o dobro de disciplina.",
        ],
      },
      {
        type: "callout",
        variant: "atencao",
        title: "Atenção",
        text: "Violações tiram pontos da sua conta. Os pontos zeram a cada 90 dias e dá para recorrer.",
      },
    ],
  },
  {
    slug: "seus-primeiros-2-mil-seguidores",
    blocks: [
      {
        type: "callout",
        variant: "atencao",
        title: "Sobre os 2 mil seguidores",
        text: "O TikTok Shop libera a loja para algumas contas com menos de 2 mil seguidores. Mas as ferramentas completas — vitrine, link no vídeo, amostras e campanhas — só liberam a partir dos 2 mil. Ou seja: dá para começar antes, só que o jogo completo começa nos 2 mil. Confirme os requisitos atuais no app.",
      },
      {
        type: "callout",
        variant: "lembre",
        title: "Já tem uma conta antiga?",
        text: "Pode e deve usar, mesmo parada há tempos. Publique pelo menos um vídeo para “avisar” o algoritmo de que você voltou.",
      },
      { type: "h3", text: "Caminho orgânico: criar conteúdo" },
      {
        type: "p",
        text: "É a forma mais prática de ganhar seguidores. Você não precisa ser influenciadora nem ter a vida perfeita: as pessoas se conectam com pessoas reais.",
      },
      {
        type: "cards",
        items: [
          {
            title: "Trends",
            text: "Assuntos do momento com os quais muita gente se identifica e compartilha.",
          },
          { title: "Rotina", text: "Seu treino, seus estudos, seu dia. Gera identificação e conexão." },
          {
            title: "Dica ou opinião",
            text: "Algo que você sabe fazer bem e que ajuda outras pessoas.",
          },
          {
            title: "Apoio entre garotas",
            text: "Vídeos e comentários de “vamos apoiar umas às outras”. Interaja, siga e peça para seguirem de volta.",
          },
        ],
      },
      {
        type: "p",
        text: "No CapCut existem modelos prontos: é só adicionar seus takes.",
      },
      { type: "h3", text: "Exemplos de conteúdo para chegar aos 2 mil" },
      {
        type: "p",
        text: "Esses vídeos não precisam vender nada. Eles existem para o algoritmo entender quem você é e para as pessoas quererem te seguir — a venda vem depois, com link.",
      },
      {
        type: "cards",
        items: [
          {
            title: "“Adivinha quanto custou”",
            text: "Tela verde com o print do preço na farmácia e no TikTok Shop. Revela no final: “aqui deu R$ 19,90”. Curiosidade pura, e já planta o desejo pelo produto.",
          },
          {
            title: "“O que eu compraria de novo”",
            text: "Três achados que você já usa, mostrados rápido na mão. Conselho de amiga, sem parecer anúncio: “esse aqui eu compraria mil vezes”.",
          },
          {
            title: "“3 erros que deixam o cabelo com cara de descuidado”",
            text: "Dica ou opinião, sem produto nenhum. É o tipo de vídeo que salva e compartilha — o que mais entrega seguidor no começo.",
          },
          {
            title: "“Respondendo: esse produto é bom mesmo?”",
            text: "Responda um comentário mostrando o produto no corpo e o que mudou. Vídeo de resposta puxa quem já comentou de volta para o perfil.",
          },
          {
            title: "“Rotina de 5 minutos antes de sair”",
            text: "Seu banho, seu creme, seu cabelo, com os produtos que você tem em casa. Rotina gera identificação e faz a pessoa voltar amanhã.",
          },
          {
            title: "Trend com texto “quando descubro que tem no TikTok Shop por R$ 19,90”",
            text: "Áudio em alta + texto na tela + você usando o produto. Efeito trend, sem precisar falar nada e sem cara de propaganda.",
          },
        ],
      },
      { type: "h3", text: "Caminhos acelerados (com cautela)" },
      {
        type: "list",
        items: [
          "Lives de crescimento: entrar é grátis. Você envia presentes ao criador para ele destacar seu perfil. Lives menores costumam custar menos.",
          "Promover vídeos: funciona, mas pode “viciar” o algoritmo em investimento. Depois você vai precisar reeducá-lo com bastante conteúdo de TikTok Shop.",
        ],
      },
      {
        type: "callout",
        variant: "ouro",
        title: "Quanto tempo leva?",
        text: "Não existe prazo fixo. No caminho orgânico, espere pelo menos 10 a 15 dias de constância antes de avaliar. Postar dois vídeos e desistir não vale.",
      },
    ],
  },
  {
    slug: "a-central-do-criador-por-dentro",
    blocks: [
      {
        type: "p",
        text: "Você acessa pelo perfil, em Central do Criador do TikTok Shop. É lá que acompanha quanto vendeu, quanto vai receber e quais vídeos estão funcionando.",
      },
      {
        type: "table",
        columns: ["Área", "Para que serve"],
        rows: [
          ["Dashboard", "GMV, itens vendidos e comissão estimada do dia, da semana ou do mês."],
          ["Vídeos", "Filtre por “itens vendidos” ou “GMV atribuído” para ver quais vídeos mais venderam."],
          ["Mercado de produtos", "Mais vendidos, mais pesquisados e recomendações para o seu perfil."],
          ["Gerenciar vitrine", "Seus produtos. Em “a melhorar” ficam os esgotados, com opção de produtos semelhantes."],
          ["Receita", "Saldo, ganhos diários, pagamentos semanais e seus dados bancários."],
          ["Pedidos de afiliados", "Mostra se cada venda veio do seu vídeo orgânico ou de um anúncio da loja."],
          ["Amostras e convites", "Pedidos de amostra e convites de colaboração dos vendedores."],
          ["Aprenda com criadores", "Vídeos que estão vendendo, por categoria. Ouro para se inspirar."],
          ["Campanhas e Academia", "Datas com comissão maior e minicursos do próprio TikTok."],
        ],
      },
      {
        type: "callout",
        variant: "pratica",
        title: "Hábito de ouro",
        text: "Toda semana, abra Vídeos → itens vendidos e estude seu top 5. O que fez cada um vender: o gancho, o produto, a música, o texto? Repita o modelo com outros produtos.",
      },
      { type: "h3", text: "Comissão: orgânica × anúncio da loja" },
      {
        type: "p",
        text: "A comissão orgânica costuma ficar em torno de 10 a 12%, às vezes menos. Quando o vendedor paga anúncio para impulsionar o seu vídeo, a comissão cai para cerca de 1 a 2%. Mesmo assim vale muito, porque é dinheiro dele trabalhando para você vender todos os dias.",
      },
      { type: "h3", text: "Os níveis da sua conta" },
      {
        type: "p",
        text: "Os níveis seguem o GMV acumulado e liberam benefícios como mais exposição, amostras grátis e campanhas.",
      },
      {
        type: "table",
        columns: ["Nível", "GMV acumulado"],
        rows: [
          ["0", "R$ 0"],
          ["1", "R$ 1 a R$ 4.999"],
          ["2", "a partir de R$ 5 mil"],
          ["3", "a partir de R$ 15 mil"],
          ["4", "a partir de R$ 50 mil"],
          ["5", "a partir de R$ 150 mil"],
          ["6", "a partir de R$ 500 mil"],
        ],
      },
      {
        type: "callout",
        variant: "atencao",
        title: "Dois cuidados no começo",
        text: "Botão “Promover”: evite no início. Se o algoritmo entende que você paga para entregar vídeos, você pode ficar refém disso. Convites de colaboração: aceite por produto, um a um — “adicionar tudo” joga todos os produtos na sua vitrine de uma vez.",
      },
    ],
  },
  {
    slug: "seu-link-de-afiliada-no-video",
    blocks: [
      { type: "h3", text: "1. Tornar-se parceira do produto" },
      {
        type: "steps",
        items: [
          { title: "Abra a aba Loja", text: "pelo seu perfil (vitrine e loja)." },
          { title: "Escolha o produto", text: "e confira a comissão por venda." },
          { title: "Toque em “Adicionar à vitrine”.", text: "Pronto, você é afiliada dele." },
        ],
      },
      { type: "h3", text: "2. Colocar o link no vídeo" },
      {
        type: "steps",
        items: [
          { title: "Grave ou importe seu vídeo", text: "e toque em avançar." },
          { title: "Toque em “Adicionar link” → Produto.", text: "" },
          { title: "Escolha o produto certo da vitrine.", text: "Confira duas vezes." },
          {
            title: "Personalize o nome do link",
            text: "de forma clara, por exemplo “Regatinha confortável”.",
          },
          { title: "Publique ou salve nos rascunhos", text: "para postar depois." },
        ],
      },
      {
        type: "callout",
        variant: "pratica",
        title: "Na prática",
        text: "Escolha um produto de uma área que você domina — make, mundo fitness, moda. Se o conteúdo já está pronto, não esqueça de adicionar o link do produto: o próprio app identifica automaticamente as vendas feitas pelo seu link.",
      },
      {
        type: "callout",
        variant: "lembre",
        title: "Esqueceu o link?",
        text: "Central do Criador → Vincular produtos. Escolha o vídeo e adicione o produto.",
      },
      {
        type: "callout",
        variant: "lembre",
        title: "Produto esgotou?",
        text: "Central do Criador → Gerenciar vitrine → A melhorar → três pontinhos → produtos semelhantes.",
      },
      {
        type: "callout",
        variant: "ouro",
        title: "Pense na comissão",
        text: "Não existe regra, mas comissões muito baixas (R$ 1 ou R$ 2) exigem muitas vendas para valer o esforço. Muitas criadoras preferem produtos com pelo menos R$ 3 de comissão por venda.",
      },
    ],
  },
];
