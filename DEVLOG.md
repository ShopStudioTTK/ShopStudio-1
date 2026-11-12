# DEVLOG

Diário de desenvolvimento do Shop Studio: o que foi feito, em que ordem e **por quê**. As entradas mais recentes ficam no topo. Para o estado atual e como rodar, veja o [`README.md`](README.md).

---

## 2026-11-12: A persona sai do banco (`ai_config` → `src/lib/persona.ts`) e os vídeos "campeão" do `chapter_videos`

**Pedido:** a dona achou que não fazia sentido uma tabela de uma linha só, lida em toda pergunta e todo roteiro. Pediu para manter a regra (a voz da Ana com "gnt", "pq", emoji) e aplicá-la de outro jeito. Também perguntou se o `chapter_videos` estava em uso.

**`ai_config` → constante:**
- O texto da linha (o mesmo da migration inicial) virou `PERSONA` em `src/lib/persona.ts`, `server-only`. Os prompts ficaram iguais, sem a consulta ao banco.
- O assistente usa a persona só sem `OPENROUTER_PRESET`, como antes. O roteiro usa sempre.
- Saiu `configDaIA`. A migration `20261112030000_remove_ai_config` apaga a tabela.
- **Custo:** mudar a persona agora exige deploy, em vez do painel do Supabase.
- Primeiro a persona saiu inteira dos prompts. A dona corrigiu: a regra fica, só a tabela sai.

**`chapter_videos` (decisão: só tirar o código morto):** a página do capítulo continua mostrando os vídeos cadastrados pelo painel. Saiu a coleção "campeão" (`?colecao=campeao` e `useChampionVideos`), sem uso desde que os Campeões ganharam tabela própria. A coluna `colecao` ficou no banco, sem uso.

## 2026-11-12: Sai a tabela `ai_knowledge`

**Pedido:** a dona viu a tabela vazia e pediu para tirar tudo relacionado a ela.

**Por que estava vazia:** veio do app original. O banco começou do zero na migração, e nenhuma tela ou rota escrevia nela, só o painel do Supabase. Mesmo assim, `configDaIA()` a lia em toda pergunta e em todo roteiro. O papel dela já é coberto pelo material (`transcricao.md`, `dossie.md`) e pelo treinamento da IA.

**Como ficou:** `configDaIA()` devolve só a persona (`ai_config`). `buildAssistantSystemPrompt` e `buildSystemPrompt` perderam o parâmetro `knowledge` e o bloco da base. A migration `20261112020000_remove_ai_knowledge` apaga a tabela.

## 2026-11-12: Assistente avisa quando o provedor cai e oferece "Tentar de novo"

**Pedido:** os provedores do DeepSeek (Morph e DeepInfra) devolveram 504 e 499, e o assistente simplesmente não respondeu: a bolha "Pensando" sumia sem aviso. A dona quer uma mensagem e um botão para a aluna reenviar a última mensagem.

**Causa:** com o stream já aberto, a OpenRouter avisa a queda com um evento de erro (`finish_reason: "error"`) ou corta o stream. O `use-ai-chat.ts` só tratava o erro HTTP e o evento `error`, e mostrava o texto técnico do provedor. Um stream que acabava vazio ou sem `finish_reason` só tirava a bolha, sem mensagem nenhuma. Do lado do servidor, o crédito era cobrado mesmo assim.

**Como ficou:**
- **Tela (`use-ai-chat.ts` + `assistente/page.tsx`):** a resposta só vale se o stream terminar com `finish_reason: "stop"` e trouxer texto. Contam como falha um 5xx, a rede caída, um evento de erro, um stream cortado e um stream vazio. Nesses casos, a meia resposta sai da tela, a pergunta da aluna fica e aparece o aviso com o botão **"Tentar de novo"** (`tentarDeNovo`), que reenvia a pergunta sem duplicar a bolha. Um 4xx (login, acesso, créditos) mostra a mensagem do servidor, sem botão, porque repetir não adianta.
- **Servidor (`/api/assistente`):** no fim do stream, uma resposta que não terminou em `stop` ou veio vazia devolve o crédito (`devolverCredito`). O custo continua registrado em `ai_perguntas`.
- **Limite conhecido:** se a conexão com a OpenRouter quebrar sem fechar o stream, o `flush` do `comRegistroDeUso` não roda e o crédito não volta.
- **Provedores:** o commit `8313008` (na `main`) pôs a DeepInfra antes da Morph. Os testes e o comentário de `PROVEDORES` foram atualizados para essa ordem.

## 2026-11-11: Gerador de roteiros na voz da Ana, regras por formato, preço opcional e exemplos fixos

**Pedido:** um segundo feedback trouxe um prompt inteiro "na voz da Ana" e três ajustes de código.

**O que a dona decidiu:**
- **Aplicar:** as regras por formato, a duração por formato na tela, a lista de frases proibidas, a cena entre colchetes e as fichas em minúsculas no embedding.
- **A voz da Ana como o texto manda:** muda a decisão de 2026-11-06, de roteiro na voz da aluna.
- **Preço:** campo opcional; só com ele o roteiro fala de valor.
- **Fofoca com prova social:** só nas opções de gancho.
- **Fichas:** a admin marca algumas como exemplo fixo de voz.
- **Ficou de fora:** CTA sempre com urgência ("vai esgotar", "escolhe sua cor"); "não repetir CTA entre roteiros" (cada geração é independente); autoconferência no prompt; os 4 exemplos com preço inventado; trocar o prompt inteiro.

**Como ficou:**
- `METHOD` reescrito em três blocos:
  - COMO A ANA FALA: vocativos (pelo menos 2), expressões, CAIXA ALTA (2 a 4), palavras esticadas (1 ou 2), português falado, frases proibidas e colchetes de cena;
  - ESTRUTURA, com os tipos de gancho;
  - FORMATOS, com Unboxing antes de abrir, Tela verde apontando, Storytelling em arco e Música viral sem fala, "Texto na tela: …" e 7 a 15 s.
- As regras de verdade e de resultado como experiência ficaram. A ancoragem de preço só compara com o preço que a aluna informou.
- **JSON:** os 5 ganchos são de tipos diferentes (fofoca, provocação, indignação com preço ou curiosidade, problema, reação de unboxing ou transformação), e o gancho do roteiro nunca é o de fofoca. Os CTAs não citam cor, tamanho, estoque nem preço não informado.
- `preco` (até 40 caracteres) no pedido; `buildUserPrompt` diz "não informado: não cite nenhum valor" quando falta.
- `duracaoDoFormato` (`src/content/formatos.ts`): "7 a 15s · sem fala" na Música viral e "30 a 60s" nos outros, com o tempo de cada parte no cartão do roteiro.
- **Fichas:**
  - `textoDaFicha` e a busca da aluna em minúsculas;
  - `POST /api/fichas/reindexar`, só admin, 4 embeddings por vez, com o botão "Reindexar fichas";
  - coluna `exemplo_fixo` (migration `20261112000000`), marcada no formulário;
  - `listarExemplosFixos` (até 6) entra no `blocoDasFichas` como "EXEMPLOS DE VOZ DA ANA", depois dos gatilhos e antes das parecidas, sem repetir uma que já é modelo.

**Medido** com a OpenRouter de verdade, em 4 casos (escova/Conselho de amiga, babydoll com R$ 59,90/Storytelling, conjunto fitness/Unboxing, pijama de cetim/Música viral), 2 roteiros de cada:

| | Antes | Depois |
|---|---|---|
| Vocativos no roteiro | 0 a 2 | 1 a 4 (quase sempre 2 ou mais) |
| Palavras em CAIXA ALTA | 0 | 0 a 3 |
| Palavras esticadas | 0 | 0 a 1 |
| Cena entre colchetes | 0 | 1 a 2 nos formatos falados |
| Música viral sem fala ("Texto na tela") | não | sim |
| Preço com o campo preenchido | (sem campo) | aparece só o valor informado |
| Preço sem o campo | 0 | 0 |
| Fofoca entre os 5 ganchos / no gancho principal | 0 / 0 | 1 / 0 |
| Detalhe inventado no 5×5 | 0 | 1 ("cores disponíveis" num CTA alternativo); 0 depois do reforço na descrição dos CTAs |

Exemplos: "Gente… abri a caixa e já tô EM CHOQUE com esse conjunto." (Unboxing, antes de abrir) e "Texto na tela: Antes: camisetão velho. Depois: cetim ✨" (Música viral).

**No navegador:** o campo de preço foi no pedido; a Música viral mostrou "7 a 15s · sem fala" e "Gancho · 0–2s"; a ficha "PAPETE DE BRILHO" marcada mostrou a etiqueta "Exemplo fixo"; "Reindexar fichas" deu "1 fichas reindexadas" (vetor refeito em minúsculas); o formulário tem a caixa "Exemplo fixo de voz"; console sem erro. Conta, ficha e roteiros de teste apagados.

**Produção:** a migration `20261112000000_fichas_exemplo_fixo` vai **antes** do deploy (sem a coluna, a lista de fichas da admin quebra). Depois, a admin aperta "Reindexar fichas" uma vez e marca os exemplos fixos.

## 2026-11-11: Gerador de roteiros: ganchos variados, sem inventar detalhe e sem garantir resultado

**Pedido:** feedback de quem testou, num roteiro de "escova de cabelo", para "loira com cabelo embolado", com o benefício "parar de quebrar os fios":
- 4 dos 5 ganchos falavam de "cabelo loiro embolado";
- o roteiro citava "as cores disponíveis" e "se ainda tiver nesse preço", que a aluna não informou;
- o roteiro garantia resultado ("o nó solta sem puxar").

O primeiro ponto do feedback (fichas parecidas de outro produto) já estava resolvido pelos limiares 0,70 / 0,80. A correção sugerida para ele, gerar o embedding com produto + público + benefício, **não** foi feita: a ficha é indexada só com "produto — tipo", e juntar o público e o benefício na busca da aluna derrubaria a semelhança até do produto certo.

**Parte era do nosso prompt:** o "se ainda tiver nesse preço, aproveita" estava no próprio método, como exemplo de escassez. O "uma prova concreta" da solução empurrava o modelo a afirmar resultado. O "5 ganchos diferentes" não exigia ângulos diferentes.

**O que mudou** (só o texto de `src/lib/roteiro.ts`; mudar o prompt zera o cache uma vez):
- **Ganchos:** um de cada ângulo do método, nesta ordem: curiosidade, problema, transformação, choque, prova social. No máximo 1 dos 5 cita o público pelo nome. O gancho do roteiro continua sendo um dos 5, como desenhado: é o que faz a troca no 5×5 funcionar. Por isso **não** atendemos o "nenhum repita o gancho principal".
- **Nada inventado:** só cita característica que esteja no que a aluna preencheu. Nada de cor, tamanho, variação, kit, material, preço, promoção, frete, estoque, tempo de uso ou número. O CTA usa "confere o preço no carrinho", e a escassez só aparece se ela informou promoção ou estoque.
- **Resultado como experiência:** primeira pessoa, no que ela sentiu ou viu ("no meu cabelo soltou fácil"), nunca garantia para quem assiste. Proibidos "garantido", "100%", "nunca mais", "acaba com", "elimina", "de vez" e "definitivo". A prova da solução é o que aparece no vídeo (o produto em uso).
- Na primeira versão, o exemplo "testei por uma semana" foi copiado nos 5 roteiros e ainda inventava tempo de uso. O exemplo saiu, e a regra proíbe inventar tempo, número ou resultado que ela não contou.

**Medido** com a OpenRouter de verdade: o mesmo pedido do feedback, 5 roteiros por rodada, com a conta de admin de teste, apagada no fim.

| | Antes | Depois |
|---|---|---|
| Detalhe inventado (cor, "nesse preço"…) | 7 | 0 |
| Resultado afirmado como certo | 9 | 2 |
| Ganchos com "loira/embolado" | 15/25 | 11/25 ("loira" pelo nome, no máximo 1 por roteiro) |
| Tempo de uso inventado nos ganchos | – | 0 |
| Garantias ("100%", "nunca mais"…) | 0 | 0 |

Nos ganchos de cada roteiro aparecem, em ordem, os 5 ângulos ("Descobri por que…", "Meu cabelo embolava…", "Antes eu puxava o nó, agora…", "Joguei fora a escova antiga…", "Olha a prova: essa escova passando no nó…"). O gatilho que a IA escolhe para o roteiro continua sendo, quase sempre, "problema": é o que mais combina com o benefício "parar de quebrar".

## 2026-11-11: Créditos, pop-ups do roteiro e mural juntos na main (local)

**Pedido:** juntar tudo na `main` local antes de subir para produção.

**Como foi:**
- Merge de `feat/creditos-semanais` e depois de `feat/mural-tiktok` (que já trazia `feat/roteiro-confirmacoes`) sobre a `main` com o PR #10.
- Conflitos só nos documentos e em `script-generator.tsx`. O gerador ficou com as três coisas: créditos (aviso e trava), cartões das fichas (com formato e gatilho) e a guarda de saída. Em `podeGerar` entrou também o `!creditos.esgotado`.
- As 4 migrations novas (`20261111000000` a `030000`) estão na pasta, e o banco local não tem nenhuma pendente. Os tipos gerados batem com o arquivo.

**Verificado:** 608 testes, lint e build. No navegador (build em `localhost:3005`, OpenRouter de verdade; contas, fichas e dados de teste apagados no fim):
- o roteiro de "garrafa térmica" trouxe o cartão com "Por que aparece" e gastou 1 crédito;
- o menu com o roteiro não salvo abriu o pop-up, e "Salvar e sair" salvou e foi para o mural;
- com 31 gastos, o gerador avisou "Restam 9 créditos";
- o TikTok salvo em Minha conta virou o link do nome no mural;
- Roteiros expert mostrou as fichas e o seletor de grade;
- o menu estreitou até os ícones;
- as abas dos Campeões vieram na ordem fixa;
- a 375 px, sem rolagem lateral; console sem erro.

## 2026-11-11: Ordem fixa das abas dos Campeões

**Pedido:** a ordem das abas é fixa: Moda fitness, Moda feminina, Beleza e autocuidado, Casa e cozinha e Suplementos. As outras abas que a admin criar vêm depois. "Beleza" passa a se chamar "Beleza e autocuidado", e a dona pediu que eu lembrasse que isso precisa mudar no banco de produção.

**Como ficou:**
- `GET /api/nichos` ordena por `array_position(ORDEM, slug) nulls last, criado_em`. `ORDEM` fica em código, pelo slug: `moda-fitness`, `moda-feminina`, `beleza`, `casa-e-cozinha`, `suplementos`. Uma aba fora da lista vai para o fim, na ordem de criação.
- Migration `20261111030000_nicho_beleza_autocuidado`: muda só o rótulo de `beleza`. O slug fica, porque é a chave dos vídeos e da ordem.
- "Suplementos" não foi criada pela migration: a admin cria pela "Nova aba", que gera o slug `suplementos`, já na ordem.

**Verificado:** testes, lint e build. No navegador (build em `localhost:3005`; abas e conta de teste apagadas no fim), com "Suplementos" e uma "Pet (teste)" criadas por SQL, a ordem foi: Moda fitness, Moda feminina, Beleza e autocuidado, Casa e cozinha, Suplementos, Maternidade e Pet (teste).

**Produção:** rodar o `supabase db push` (ou o `update` do CLAUDE.md), criar "Suplementos" e conferir se os slugs de produção batem com `ORDEM`.

## 2026-11-11: Limiares das fichas mais altos, o porquê de cada ficha e a página Roteiros expert

**Pedido:**
- O cartão "produtos parecidos" mostrava fichas de produtos que não eram o mesmo, e só 1 apareceu.
- A dona propôs 0,85. Com os números de 2026-11-10 (o mesmo produto ≈ 0,73–0,75), isso esconderia até a ficha do mesmo produto, então ela escolheu **0,70** para o cartão e **0,80** para o prompt.
- "Só 1" não era defeito: o cartão mostra **até** 3 fichas acima do limiar.
- Ela também pediu:
  - mostrar em cada ficha o quanto e no que ela parece com o roteiro;
  - uma página com todos os roteiros das experts, com o porquê escondido até a aluna pedir;
  - o nome **Roteiros expert**.

**Como ficou:**
- `LIMIAR_CARTAO = 0,7` e `LIMIAR_MODELO = 0,8` (`src/lib/fichas.ts`). Agora o prompt é mais exigente que o cartão: só o produto quase igual molda o roteiro.
- `porQueAparece` (`src/lib/fichas-tipos.ts`, com teste) dá as etiquetas de cada ficha, só do que bate: "Produto 75% parecido", "Mesmo formato · Unboxing", "Mesmo gatilho · Fofoca". As etiquetas substituíram o "% parecido" do cartão.
  - O cartão 2 ("desse jeito") não calcula a semelhança do produto: as fichas acima de 0,70 já entram no cartão 1, então a etiqueta de produto nunca apareceria ali.
- Os cartões ganharam "Abrir na página" (por ficha) e "Ver todos os roteiros expert", em outra aba, para o roteiro gerado não se perder.
- Página `/app/roteiros-expert`, no menu (Criar):
  - as fichas como roteiro pronto (gancho, problema, solução, CTA), com produto, formato, gatilho e tipo;
  - "Ver o porquê" abre o porquê e a entonação de cada parte;
  - busca pelo produto e filtro por formato;
  - `?ficha=<id>` rola até a ficha, que vem destacada e aberta.
- `GET /api/roteiros-expert` com `autenticar()` e `listarFichas()`, sem embedding nem `criado_por`. A rota de admin `/api/fichas` continua igual.
- **Achado no teste:** o menu acendia "Ganchos e roteiros" também em `/app/roteiros-expert`, porque a regra era "o caminho começa com". Agora é "igual, ou começa com o caminho + `/`".

**Depois de a dona avaliar com 50 fichas de teste:**
- O subtítulo dos cartões ficou maior. O do cartão "desse jeito" diz que nem sempre é o mesmo produto: as fichas aparecem pela intenção do vídeo, o mesmo formato e o mesmo gatilho.
- As etiquetas vêm depois de "Por que aparece:".
- O nome da ficha também leva à página, com ela aberta.
- A página mostra até 5 roteiros por linha a partir de 1400 px (4 a 1280 px, 1 no celular).

Depois, também a pedido da dona:
- A página voltou para no máximo 4 por linha, porque com 5 ficava apertado.
- **Menu lateral redimensionável:** uma alça na borda direita estreita o menu de 272 px (a largura de antes, o máximo) até 76 px.
  - Abaixo de 180 px ficam só os ícones, com o nome no `title` e para o leitor de tela. A marca vira "shop / studio" empilhada, e a conta vira o avatar com o botão de sair embaixo.
  - Entre 180 e 272 px, os nomes ficam numa linha, cortados com reticências.
  - A alça tem `role="separator"`: as setas do teclado mudam 16 px e o duplo clique volta ao máximo.
  - A largura fica no `localStorage` (conveniência, como o modo "Tô começando / Já vendo").
  - A alça não ocupa espaço (margem negativa dos dois lados) e não aparece no celular.
  - No navegador: começa em 272; arrastar além não passa disso; 210 mantém os nomes; o mínimo é 76, só com os ícones; recarregar mantém a largura; duas setas para a direita somam 32; o duplo clique volta a 272; a 375 px não há menu lateral, alça nem rolagem lateral; console sem erro.

**Grade escolhida pela aluna** (pedido da dona): "Por linha", de 1 a 4, ao lado da busca, guardado no navegador e escondido no celular, onde é sempre 1.
- Com mais de 3 na linha, o cartão mostra só o gancho e "Ver o roteiro" abre o roteiro inteiro num pop-up (Radix Dialog), com "Ver o porquê" lá dentro. Com até 3, fica como antes.
- A regra olha o que cabe de verdade: escolher 4 numa tela abaixo de 1280 px mostra 3, então fica sem pop-up (`abreEmPopup`, com o `matchMedia` do mesmo `xl`).
- O `?ficha=` do gerador abre o pop-up daquela ficha, com o porquê, quando a grade está em 4; senão, rola até a ficha.
- No navegador:
  - o padrão é 4 com pop-up, e "Ver o porquê" funciona dentro dele; Esc fecha;
  - 3, 2 e 1 mostram o roteiro inteiro no cartão;
  - recarregar mantém a escolha, e 4 a 1100 px vira 3 sem pop-up;
  - o link da air fryer abre o pop-up dela com 4 e rola até ela com 2;
  - celular sem o seletor e sem rolagem lateral; console sem erro.

**Até 6 por linha** (pedido da dona): a escolha vai de 1 a 6. `colunasNaTela` diz quantos cartões cabem de verdade, pelos mesmos sm/lg/xl das classes: celular 1; a partir de 640 px, até 2; a partir de 1024 px, até 3 (4 com a escolha 6); a partir de 1280 px, a escolha. O pop-up vale quando passam de 3. No modo resumido, o cartão tem menos espaço interno e um título menor.
- No navegador, a 1440 px: de 1 a 6 por linha, com o roteiro inteiro até 3 e o pop-up de 4 a 6.
- A escolha 6 a 1100 px dá 4 com pop-up; a 5 a 1100 px dá 3 sem pop-up; a 800 px, 2.
- O link com 6 abre o pop-up da ficha, e recarregar mantém a escolha.
- Celular: 1 por linha; console sem erro.
- No fim, as 50 fichas, as contas e os 22 roteiros de teste foram apagados.

Medido com as 50 fichas: "garrafa térmica", "escova alisadora" e "air fryer 4 litros" trazem 2 fichas no cartão. **Nomes curtos ficam abaixo de 0,70 mesmo havendo ficha do mesmo produto:** "air fryer" (a ficha é "Air fryer 4 litros"), "legging de academia", "copo térmico", "protetor solar", "chapinha", "potes de vidro". Com o nome um pouco mais completo eles aparecem ("copo térmico com tampa" = 0,81). Se a dona quiser pegar os curtos, o caminho é baixar o cartão para perto de 0,65.

**Verificado:**
- Testes, lint e build.
- No navegador, com o build em `localhost:3005` e a OpenRouter de verdade (admin, aluna e as 5 fichas de teste apagadas no fim):
  - fichas: duas garrafas térmicas, um copo térmico, um sérum e um organizador;
  - "garrafa térmica" em Unboxing trouxe Stanley a 0,751 e a de inox a 0,711 no cartão; o copo térmico ficou abaixo de 0,70;
  - etiquetas da Stanley: "Produto 75% parecido" e "Mesmo formato · Unboxing";
  - "Abrir na página" abriu outra aba com a Stanley destacada e com o porquê;
  - a página lista as 5, e "Ver o porquê" abre as 4 partes;
  - o filtro Unboxing deixou 3 e a busca "garrafa" deixou 2;
  - a 375 px, sem rolagem lateral; console sem erro.

## 2026-11-11: Campeões aceitam o link curto do celular

**Pedido:** no celular, "copiar link" do TikTok dá `vt.tiktok.com/ZS…/`; no PC, `https://www.tiktok.com/@perfil/video/<id>?_r=1&_t=…`. Os dois precisam entrar.

**O que mudou:**
- `linkCurtoDoTiktok` (`src/lib/video.ts`) reconhece `vt.tiktok.com`/`vm.tiktok.com` com um código só no caminho. As duas funções aceitam o link sem `https://`.
- `POST /api/campeoes` resolve o link curto com `fetch(…, { redirect: "manual" })` e lê só o `Location` (um 301 direto para o link completo), com 5 s de limite. Isso não é scraping, porque a página não é aberta. O destino passa de novo por `urlDoTiktok`, e o banco continua guardando só o formato completo. Se o destino não for um vídeo ou o TikTok não responder, a rota devolve 400. Só a admin chega nesse código (`admin()` vem antes), e o host é fixo, então não abre SSRF.
- Na tela, a checagem aceita os dois formatos.

**Verificado:** testes, lint e build. Com o link real, `vt.tiktok.com/ZSpmQHBdV/` e o link do PC dão o mesmo `https://www.tiktok.com/@kevelybr/video/7661082129920527636`.

## 2026-11-11: Créditos semanais no lugar dos limites diários

**Pedido:** 40 créditos por semana, sem acumular, renovando no domingo. Uma pergunta ou um roteiro custa 1, e os que exigem mais custam meio crédito a mais. Admin tem créditos ilimitados.

**Decisões da dona:**
- os limites diários (15 perguntas e 10 roteiros) saem, e ficam só os 40 créditos;
- preço pelos tokens de saída, como proposto: pergunta 1 até 600, +0,5 a cada 600; roteiro 1 até 2.000, +0,5 a cada 1.000; teto de 2;
- o saldo não aparece na tela; só o aviso quando restam 10 ou menos;
- uma tabela nova para os créditos.

**Por que tokens de saída:** o material (~80 mil tokens no assistente, ~12 mil no roteiro) é igual para todas e fica em cache. O que varia é o que a IA escreve e pensa. Cobrar pelo custo em US$ puniria a aluna por um cache vazio, que não depende dela. Amostra do banco local: pergunta com ~280 tokens típicos (90% abaixo de ~480, máximo de 721); roteiro com ~1.500 (90% abaixo de ~2.000, máximo de 2.410). Quase tudo custa 1.

**Como ficou:**
- Tabela `creditos_semana` (`user_id`, `semana` = o domingo, `gastos`). Cada semana é uma linha nova, então o reset é sozinho, sem cron. O banco recusa uma `semana` que não seja domingo.
- `reservarChamada` reserva 1 crédito numa consulta só (`insert … on conflict do update … where gastos + 1 <= 40`). Isso resolve a ressalva antiga das duas abas, que podiam passar 1 do limite. No fim, `cobrarCreditos` soma o que passou de 1, com teto de 40. A reserva guarda a semana, então uma chamada que cruza a meia-noite de domingo acerta a semana em que começou.
- Falha da IA = `liberarChamada`, que devolve o crédito antes de apagar a linha. **Mudança:** o roteiro cortado ou sem JSON antes contava no limite; agora devolve o crédito (o custo continua em `ai_perguntas`), porque a aluna não recebeu nada.
- O assistente agora confere `ehAdmin`, como o roteiro: a admin não grava nada em `creditos_semana`.
- `GET /api/creditos` (com `autenticar()`) devolve `{ restantes }`, ou `{ ilimitado: true }` para a admin. Ele substitui o `GET /api/assistente`, que contava as perguntas do dia. O cabeçalho `X-Perguntas-Restantes` saiu.
- Tela: `useCreditos`. Assistente e gerador mostram o aviso com 10 ou menos e travam abaixo de 1.
- Perguntas e roteiros de antes da mudança não contam: a semana em que isso entrar começa com 40.

**Verificado:**
- Testes, lint e build.
- SQL no Postgres local, com rollback: com 39,5 gastos, a reserva não volta linha; a semana nova começa em 1; o teto segura em 40; uma quarta-feira como `semana` é recusada; `authenticated` sem permissão.
- No build em `localhost:3005`, com a OpenRouter de verdade (conta de teste apagada no fim): 40 → 39 depois de uma pergunta → 38 depois de um roteiro (1.416 tokens). Com 39,5 gastos, `restantes: 0.5`, e a pergunta deu 429 sem gastar. Como admin, `ilimitado: true`, e a pergunta não mexeu no saldo.
- **No navegador** (Chrome headless pelo Playwright, build em `localhost:3005`, conta de teste apagada no fim; console sem erro):
  - com 40 restantes, nenhum aviso no assistente nem no gerador;
  - com 9, "Restam 9 créditos nesta semana. Renova no domingo." embaixo do campo do assistente e do botão "Criar meu roteiro", com os dois ativos;
  - com 0,5, "Seus créditos da semana acabaram. Domingo tem mais." e o campo e o botão travados;
  - o aviso acompanha o uso real: 8 → 7 depois de uma pergunta e 7 → 6 depois de um roteiro, sem recarregar;
  - a 375 px, sem rolagem lateral nas duas telas.

**Limite conhecido:** se a aluna fecha a aba no meio do stream, o fim não roda e fica só o 1 crédito reservado (o custo também não é registrado, como antes).

## 2026-11-11: Mural das alunas: só vídeo do TikTok, nome da conta e fixar só da admin

**Pedido:** testar o mural no navegador. O teste mostrou que ele funcionava, mas:
- qualquer aluna podia fixar no topo;
- o link do Drive, que o próprio formulário sugeria, dava imagem quebrada;
- o cartão só com texto tinha um bloco vazio;
- os cartões esticavam até a altura do maior;
- apagar não pedia confirmação;
- o resultado ficava em caixa alta;
- o nome era livre, e não havia limite por dia.

**Decisões da dona:**
- fixar só a admin;
- sem imagem: só vídeo do TikTok, tocando como nos Campeões;
- cartões com altura parecida;
- apagar pede confirmação;
- resultado legível;
- 10 por dia;
- o nome é o da conta, e a aluna não preenche.

**Como ficou:**
- `POST /api/resultados`:
  - o nome vem do token (`nomeDoPerfil`, ou "Aluna do Shop Studio");
  - o `destaque` não vem mais da aluna;
  - o vídeo passa por `resolverUrlDoTiktok`, que saiu da rota dos Campeões para `src/lib/video.ts`, então o link curto do celular também vale;
  - exige depoimento ou vídeo;
  - o resultado vai até 80 caracteres;
  - o limite de 10 por dia é contado no próprio insert.
- `PATCH /api/resultados` com `admin()` fixa e desafixa qualquer cartão.
- Migration `20261111010000_mural_so_tiktok`: o banco só aceita vídeo do TikTok em `midia_url`. Ela é `not valid`, então os prints antigos ficam e a tela mostra só o texto deles.
- **Tela:**
  - todo cartão tem o tamanho do player do TikTok (9:16, até 320 px), em 3 colunas como nos Campeões. O vídeo usa o `VideoEmbed`; o depoimento sem vídeo vai num quadro escuro, centralizado, com a letra maior para texto curto e "Ler mais" para o longo;
  - o resultado aparece em rosa, sem caixa alta;
  - a admin vê o alfinete e o "Fixado";
  - apagar usa o `Confirmacao`;
  - o formulário mostra "Vai aparecer como <nome>", com link para Minha conta.

**Verificado:**
- Testes (rota nova em `tests/app/api/resultados/route.test.ts`), lint e build.
- A restrição foi conferida no Postgres local numa transação desfeita. O `migration up` recusou porque o banco local tem a migration dos créditos, de outra branch; ela entra quando as branches se juntarem.
- No navegador (Chrome headless, build em `localhost:3005`, três contas de teste apagadas no fim):
  - o nome vem da conta, e sem nome aparece "Aluna do Shop Studio";
  - o formulário não tem o "Fixar", nem o campo de nome, nem a opção de print;
  - envio vazio e link de imagem são recusados, e a 11ª publicação do dia dá o aviso do limite;
  - vídeo com query é aceito, e as publicações só com texto aparecem;
  - apagar: "Cancelar" mantém e "Apagar" tira;
  - a aluna B só tem lixeira no dela e não tem o alfinete;
  - a admin fixa (vai para o topo com "Fixado") e desafixa;
  - o print antigo aparece só com o texto;
  - os cartões ficam entre 547 e 646 px de altura;
  - a 375 px, sem rolagem lateral.
**Ajuste depois de a dona ver com 10 publicações de teste:**
- tudo menor, com até 4 cartões por linha em tela larga (a partir de 1280 px) e até 280 px no celular;
- o resultado virou o título do cartão; embaixo dele, o depoimento e, por último, o nome da aluna, pequeno.

Medido: a 1440 px, 4 por linha com 241 px de largura (alturas entre 464 e 593); a 1280 px, 4 por linha com 213 px; a 375 px, 1 por linha com 280 px, sem rolagem lateral.

**Depois, também a pedido da dona:**
- Nos cartões sem vídeo, o resultado (título) fica dentro do quadro, em cima do depoimento. Nos com vídeo, continua embaixo do vídeo.
- **TikTok da aluna:** Minha conta ganhou o cartão "TikTok".
  - Ela cola o `@` ou o link do perfil; `perfilDoTiktok` limpa para `https://www.tiktok.com/@usuário`, e o banco só aceita esse formato.
  - Não pede senha, porque não é login, e vazio tira o link.
  - Fica em `profiles.tiktok` (migration `20261111020000_perfil_tiktok`), fora dos metadados que viajam no JWT; o `GET /api/conta` devolve o link para a tela.
  - No mural, o `GET` faz `left join` em `profiles`, e o nome da aluna vira link para o TikTok dela, em outra aba. Quem não pôs fica sem link. O perfil só aparece porque ela escolheu pôr.
- **No navegador** (contas de teste):
  - em Minha conta, o link do Instagram foi recusado e "@tiktok" foi salvo como o link limpo, que continua lá depois de recarregar;
  - no mural, os 3 nomes da Camila viraram link e os de quem não pôs ficaram sem;
  - o título aparece dentro do quadro sem vídeo e embaixo do vídeo;
  - a 375 px, sem rolagem lateral.
- Banco local: a cópia do arquivo da migration dos créditos voltou à pasta só para o `migration up` rodar e foi apagada em seguida. Os tipos receberam só a coluna `tiktok`, sem a tabela dos créditos, que é de outra branch.

- **Não conferido:** o vídeo tocando. No Chrome automatizado, o player do TikTok responde "Server error", mesmo com o vídeo de exemplo da documentação dele (o oEmbed responde 200). É o mesmo player dos Campeões, já visto funcionando num navegador normal.

## 2026-11-11: Roteiro não salvo pergunta antes de sair; apagar pede confirmação

**Pedido:** na tela de roteiros, ao sair com um roteiro gerado, um pop-up pergunta se ela quer salvar antes; ao apagar um roteiro, outro pergunta se é isso mesmo. E limpar os estados ao sair de cada página.

**Limpar estados:** não foi feito, de propósito. No React 18/19, a página desmonta ao navegar e o estado vai junto (o aviso de "update em componente desmontado" saiu no React 18). O Next só preserva páginas escondidas (`<Activity>`) com `cacheComponents`, que está desligado desde a migração. O que precisa de cleanup são recursos externos (listeners, timers, a inscrição do login), e todos já tinham. O stream do assistente continua até o fim se a aluna sai no meio, de propósito: cortar faria o servidor não registrar o custo.

**Decisões da dona:** o pop-up de saída só aparece com um roteiro gerado e não salvo, e oferece salvar antes. **Decisões minhas:** depois de salvar não pergunta; enquanto o roteiro está sendo escrito também não; "Outra versão" continua sem perguntar; abrir outro roteiro da biblioteca pergunta (o não salvo sairia da tela); o mural fica como está.

**Como ficou:**
- `useGuardaDeSaida(ativa)`: enquanto ativa, liga a guarda de `src/lib/saida.ts` e escuta três coisas:
  - **cliques em links:** em captura no `document`, só com `preventDefault`. O `onClick` do `Link` ainda roda (o menu do celular fecha) e ele não navega porque vê o `defaultPrevented`;
  - **voltar:** uma entrada extra no histórico com a mesma URL. O voltar cai nela, a tela continua e pergunta. Na saída, `history.go(-2)`. O `pushState` passa pelo do Next 16, que copia o estado interno dele, então o Next não recarrega a página;
  - **`beforeunload`:** recarregar ou fechar a aba.
- Saindo por link, o destino entra com `router.replace` no lugar da entrada extra. Se ela salva e fica, a entrada extra sai (`history.back()`), senão o voltar "não faria nada" uma vez. Um contador segura o StrictMode do dev, que monta duas vezes.
- "Salvar e sair" espera o salvamento. Se ele falhar, o erro aparece e o pop-up continua aberto.
- `Confirmacao`: Radix Dialog (já instalado), que prende o foco e fecha com Esc. No celular os botões ficam empilhados, com o principal embaixo.
- Teste da lógica em `tests/lib/saida.test.ts` (qual clique é saída e a guarda).

**Verificado no navegador** (Chrome headless pelo Playwright, build em `localhost:3005`, conta de teste apagada no fim; a resposta da `/api/roteiro` veio de um roteiro real gravado antes, para não chamar a IA a cada cenário). 26 cenários, todos certos e sem erro no console:
- sem roteiro, o menu sai direto;
- com roteiro: menu, Esc e "Continuar aqui" (fica, com o roteiro), "Sair sem salvar" (vai, e o voltar volta ao gerador vazio);
- botão voltar: pergunta sem sair, pergunta de novo e sai para a página anterior;
- aba "Ganchos" com "Salvar e sair": salva e troca de aba;
- depois de salvar, um voltar só já sai;
- recarregar mostra o aviso do navegador;
- abrir outro roteiro da biblioteca pergunta, e o aberto de lá sai sem perguntar;
- apagar: "Cancelar" mantém e "Apagar" tira;
- "Sair da conta" pergunta;
- a 375 px, a barra de baixo e o menu lateral perguntam, e o menu fecha.

**Visto e deixado:** com o pop-up aberto, o Radix trava a rolagem do `body`, e o menu lateral `sticky` aparece deslocado atrás do fundo escurecido (a mesma armadilha do `overflow: hidden` do CLAUDE.md). Só acontece com o pop-up aberto, coberto pelo desfoque.

## 2026-11-10: Fichas no prompt: copiar a intenção, não a frase

**Pedido:** depois do teste do rascunho, a dona pediu que a IA copie a intenção da ficha, e não o texto.

**O que mudou:** só o texto do `blocoDasFichas` (`src/lib/fichas.ts`). Ele manda usar o mesmo gatilho e o mesmo raciocínio (porquê, entonação, estrutura) no produto da aluna, sem repetir as frases da especialista: nenhuma abertura igual, nenhum trecho de 3 palavras seguidas igual, nenhuma expressão marcante, e frases novas com detalhes do produto. A primeira versão ("não repita as frases nem as expressões marcantes") não bastou: em 3 roteiros, 2 ainda abriam com "Para tudo". A segunda dá o exemplo e a regra das 3 palavras.

**Verificado com a OpenRouter de verdade** (mesma ficha do teste anterior, gancho "PARA TUDO. Olha o que acontece com esse cabelo armado em uma passada só.", gatilho choque; aluna, "escova secadora de cabelo", 0,70; contas e ficha apagadas no fim). Em 3 roteiros:
- **nenhum gancho abriu com "Para tudo"** (antes: 2 em 2);
- 2 seguiram o gatilho dela (choque), com a mesma intenção de mostrar o resultado logo de cara ("Não acreditei que uma escova só seca e alisa. Testei na frente da câmera."), e 1 foi para transformação;
- **ainda aparecem ecos** no problema ("secador numa mão e escova na outra", "saía com o cabelo preso") e o CTA dela se repetiu em 2. O CTA é quase o padrão do método ("confere o preço no carrinho"), então não pesa. Se os ecos do problema incomodarem, o próximo passo é mandar só o gancho e os porquês das outras partes, sem o texto delas.

## 2026-11-10: Ficha de roteiro começa por um rascunho da IA

**Pedido:** a expert montava a ficha do zero. Agora ela põe o produto, a IA gera o roteiro como faz para as alunas, já com o porquê e a entonação, e ela corrige o que quiser. "Escrever do zero" continua como opção, num botão ao lado do "Nova ficha". Admin não tem limite de roteiros.

**Decisões da dona:**
- a mesma rota `/api/roteiro`, com a checagem de admin dentro dela (o projeto não tem middleware);
- o rascunho traz o porquê e a entonação, e ela só corrige;
- a prévia mostra o 5×5 como a aluna vê, com as mudanças dela; no 5×5 muda só a frase escolhida, e as outras opções não são salvas.

**Como ficou:**
- `ehAdmin` no banco a cada chamada (se falhar, segue como aluna). Admin: limite `Infinity` em `reservarChamada`, então o custo continua registrado. Com `rascunho: true` de uma admin, o `RASCUNHO_BLOCK` entra depois das fichas (o cache continua valendo) e pede `tipo` e `explicacao`.
- Tela: `GeradorDeRascunho` em `fichas-roteiro.tsx`. O roteiro pronto e o 5×5 saíram do `ScriptGenerator` para o `PreviaDoRoteiro`, usado nas duas telas. Gerar de novo sempre pede confirmação: a tela não acompanha se ela mexeu no rascunho.

**Verificado:** testes, lint e build. Com o build em `localhost:3005`, uma admin de teste (apagada no fim) e a OpenRouter de verdade, "escova alisadora de cabelo" saiu em 25 s, com 1.103 tokens de saída e US$ 0,0005. Vieram o 5×5, o gatilho `problema`, o tipo "beleza capilar" e o porquê e a entonação das 4 partes. O gancho escolhido estava entre os 5, então a troca no 5×5 funciona; o problema, a solução e o CTA do roteiro pronto são parágrafos que não estão na lista, e nesses o 5×5 não muda.

**No navegador** (build em `localhost:3005`, admin e aluna de teste e a ficha apagadas no fim; console sem erro):
- **Admin:**
  - "Nova ficha" com "escova alisadora de cabelo": o formulário veio todo preenchido, com tipo "cabelo", gatilho "Problema" e porquê e entonação nas 4 partes;
  - ela trocou o gancho para "PARA TUDO. Olha o que acontece com esse cabelo armado em uma passada só.", mudou o porquê e passou o gatilho para "Choque";
  - a prévia mudou na hora: o roteiro pronto e o gancho 1 do 5×5;
  - a ficha foi salva e indexada.
- **Aluna, "escova secadora de cabelo" em Conselho de amiga:**
  - **antes da ficha:** gatilho "curiosidade", gancho "Demorei pra descobrir que dava pra secar e escovar com uma coisa só.";
  - **depois** (ficha a 0,70, no prompt e no cartão 1), duas gerações: gatilho "choque" nas duas, ganchos "Para tudo: olha o que essa escova faz com o cabelo armado em uma passada." e "Para tudo: esse cabelo armado foi embora em uma passada só.".
- **Conclusão:** a correção da admin muda o roteiro das alunas. O gatilho segue o dela, e o gancho segue a ideia e quase a frase. É o mesmo achado de antes: se a ideia é o raciocínio e não a frase, falta pedir no bloco das fichas que a IA não repita as frases dela.

Depois do teste, o formulário que nasce do rascunho passou a se chamar "Corrija o rascunho", porque as duas caixas apareciam como "Nova ficha".

## 2026-11-10: Teste de ponta a ponta com admin e aluna (e dois bugs corrigidos)

**Pedido:** um último teste no navegador com duas contas, uma admin e uma aluna: a admin treina pela tela (e pelo terminal) e a aluna usa o Pergunte pra IA e o gerador de roteiros.

**Bugs achados e corrigidos (ambos em `src/lib/api-cliente.ts`, com teste em `tests/lib/api-cliente.test.ts`):**
- **Sessão recusada travava no carregamento** (já existia). Com a conta apagada ou a senha trocada em outro aparelho, o token ainda parece válido no navegador (até 15 min). `/api/acesso` respondia 401 e a guarda ficava presa no loader, sem mandar para `/entrar`. Agora um 401 encerra a sessão local (`signOut({ scope: "local" })`), e a guarda manda para `/entrar?de=<página>`. Isso só acontece se o token recusado ainda for o atual, porque logo depois de trocar a senha a tela já entrou de novo com outro.
- **Resposta 201 com corpo virava `null`** (apareceu com as fichas). `api()` descartava o corpo de todo 201, e criar gatilho ou ficha pela tela quebrava ("Cannot destructure property 'gatilho' of null"). No teste anterior as fichas foram criadas pelo terminal, por isso não apareceu. Agora só o 204 vem sem corpo.

**Verificado no navegador** (build em `localhost:3005`, OpenRouter de verdade; contas, fichas, gatilho, respostas e conversas de teste apagados no fim, e a pergunta mapeada devolvida para pendente):
- **Admin, pela tela:**
  - "Nova pergunta" e "Responder" numa mapeada: as duas respostas salvas e indexadas;
  - ficha nova com o gatilho "Antes e depois" criado pelo "+";
  - editar só o CTA mantém a ficha indexada.
- **Admin, pelo terminal:** mais 2 respostas e 3 fichas.
- **Aluna:**
  - sem o menu Admin, e "Esta página é só da administração" em `/app/treinamento`;
  - 403 em todas as rotas de fichas, gatilhos e treinamento, sem gravar nada.
- **Pergunte pra IA:**
  - "Em quanto tempo eu consigo fazer minha primeira venda…" deu 0,963 contra a resposta da admin. A IA repetiu a resposta quase palavra por palavra (até a "girafa") e acrescentou a citação da Aula 2;
  - "dá pra colocar aquela música que tá bombando…" deu 0,743 e entrou como modelo: mesmo conteúdo e tom, nas palavras da IA (Aula 15);
  - a conversa entrou na fila de treinamento.
- **Roteiro:**
  - "sérum de vitamina C" trouxe o cartão 1 (Sérum, 47%), aberto e fechável;
  - "organizador de gaveta" (Unboxing) trouxe a ficha feita pela tela (0,78), com o gatilho novo vindo do banco. Com uma segunda ficha Unboxing + antes-e-depois, o cartão 2 trouxe a escova sem repetir o organizador;
  - quando a IA escolhe outro gatilho, o cartão 2 não aparece (certo).

**Observado:** com a ficha no prompt (≥ 0,55), o gancho do organizador saiu igual ao da Ana ("Olha o estado dessa gaveta antes... e agora olha depois."). É o mesmo achado de antes: se a ideia é o raciocínio e não a frase, falta pedir no bloco que não repita as frases dela.

## 2026-11-10: Limiares das fichas e cartões em dropdown

**Pedido:** depois do achado da calibragem, a dona baixou os limiares para **0,45** (cartão "produtos parecidos") e **0,55** (prompt do gerador), e pediu os cartões como dropdown: a aluna vê e, se quiser, fecha.

**O que mudou:** `LIMIAR_CARTAO` e `LIMIAR_MODELO` em `src/lib/fichas.ts`. Os cartões viraram `<details open>` nativos, com o título como `summary` e a seta girando: vêm abertos, e o clique no título fecha e abre.

**Depois, também a pedido da dona:** sem nenhuma ficha indexada, o gerador não chama o embedding (o cartão é um extra e não vale a espera); e `/api/roteiros-salvos` descarta `fichas` no servidor, além da tela. O risco do gatilho novo com nome quase igual a um antigo ficou como está: os gatilhos são poucos e bem diferentes entre si.

**Verificado:** testes, lint e build. No build em `localhost:3005` (conta e ficha de teste apagadas no fim), "sérum de vitamina C" agora traz o Sérum Principia no cartão 1 (47%), que antes não aparecia. A 0,47 a ficha fica fora do prompt (< 0,55), então ela aparece para a aluna sem moldar o roteiro. O cartão fecha e abre pelo título, sem erro no console.

## 2026-11-10: Treinamento de roteiros (fichas da expert)

**Pedido:** o treinamento só valia para o Pergunte pra IA. A dona quer que a expert ensine o jeito dela de pensar um roteiro: para um produto, qual gatilho no gancho e por quê, com que entonação, em que formato, e como estrutura problema, solução e CTA. Design: `docs/superpowers/specs/2026-11-10-treinamento-roteiros-design.md`; plano: `docs/superpowers/plans/2026-11-10-treinamento-roteiros.md`.

**Decisões da dona:**
- ficha campo por campo, com porquê e entonação em todas as partes (obrigatórios no gancho);
- embedding só do produto e do tipo, não do raciocínio;
- o roteiro da aluna não explica nada: é a inteligência por baixo dos panos. Embaixo dele, na ordem: 5×5 como hoje, cartão 1 ("produtos parecidos", ≥ 0,6, a mais parecida aberta e as outras numa lista) e cartão 2 ("desse jeito": mesmo formato e mesmo gatilho);
- uma lista só de gatilhos, juntando as que existiam (curiosidade, fofoca, choque, problema, transformação, prova social), numa tabela; a expert acrescenta pelo "+".

**Como ficou:** tabelas `gatilhos` e `fichas_roteiro` (migration `20261110030000`), `src/lib/fichas.ts`, rotas `/api/fichas` e `/api/gatilhos` com `admin()`, aba Roteiros no treinamento e os cartões no gerador. Fichas ≥ 0,7 entram no prompt do gerador depois do dossiê (o prefixo cacheado não muda; o campo `gatilho` no esquema do JSON zera o cache uma vez). Os cartões não vão para o roteiro salvo (dependem das fichas do momento). Não mexi nas categorias do banco de ganchos (`quebra | problema | curiosidade`), que continuam separadas.

**Verificado:** testes, lint e build. No build em `localhost:3005` com a OpenRouter de verdade (conta, fichas e gatilho de teste apagados no fim): aluna fora de `admins` → 403 em `/api/fichas`; gatilho novo 201 e "Fofóca" → 409; fichas salvas e indexadas; "sérum facial" em "Conselho de amiga" trouxe o cartão 1 com o Sérum Principia (73%) e o cartão 2 com a garrafa (fofoca + conselho de amiga), sem repetir o sérum; roteiro salvo sem `fichas` e reaberto sem cartões; console sem erro. **Não conferido:** a largura de celular (a janela não aceitou o redimensionamento).

**Achados para a dona:**
- **Limiar alto para nomes curtos.** "sérum de vitamina C" × "Sérum facial Principia — skincare" = **0,47**, e não apareceu em nenhum cartão. "sérum facial" = 0,73; "garrafa térmica" × a garrafa = 0,75; sem relação, 0,1–0,25. Com 0,6, só o mesmo produto, quase com o mesmo nome, aparece. Caminhos: baixar para ~0,45 (cartão) / ~0,55 (prompt), ou a aluna também dizer o tipo do produto.
- **A IA copia o gancho da ficha.** Com a ficha do sérum no prompt (0,73), o gancho gerado foi "Ninguém te conta isso sobre sérum facial…", quase o da Ana. Se a ideia é o raciocínio e não a frase, dá para pedir no bloco que não repita as frases dela.

 (nome, e-mail e senha)

**Pedido:** uma tela de configurações para a aluna trocar o nome, o e-mail e a senha.

**Como ficou:**
- `/app/conta`, aberta pelo cartão da conta no rodapé do menu (que agora mostra o nome). Três cartões, cada um com o seu "Salvar".
- `PATCH /api/conta` com `autenticar()`, sempre na conta do token. O nome vai para o `user_metadata.full_name` (o mesmo que `nomeDoPerfil` lê) e para `profiles`.
- **E-mail e senha só mudam com a senha atual.** São o login: sem isso, um token roubado tomava a conta. A senha é conferida pelo próprio login do Supabase (`conferirSenha` em `src/lib/supabase/admin.ts`), que encerra na hora a sessão que abriu. Errada → 403; limite de logins → 429.
- O e-mail novo entra **já confirmado** (`email_confirm: true`): os modelos de e-mail do Supabase não têm link (blindagem de 2026-11-05), então não há como confirmar por e-mail. Por isso a tela pede para conferir bem. E-mail de outra conta → 409. **Decisão da dona:** por enquanto vale na hora; a confirmação do e-mail novo pela Resend vem depois.
- Trocar a senha derruba as sessões; a tela entra de novo sozinha com os dados novos (no e-mail também, porque o token antigo ainda leva o e-mail velho). Nome só renova o token.
- `EMAIL`, `SENHA_MIN/MAX` e `senhaValida` foram para `src/lib/entrada.ts` (eram cópias nos webhooks e em `/api/senha`).

**Limite conhecido:** o Supabase limita os logins por IP (10 a cada 5 min), e a conferência sai do IP do servidor, que é o mesmo para todas as alunas. Para uma tela usada raramente, serve. Se começar a dar 429, a saída é conferir pelo hash em `auth.users`, com um limite próprio.

**Verificado:** testes, lint e build. No Supabase local (build em `localhost:3005`, contas de teste apagadas no fim): com a senha temporária pendente → 403; nome → 204; senha sem a atual ou errada → 403; com a atual → 204, o token antigo passa a dar 401 e a senha velha não entra mais; e-mail → 204, o novo entra e o velho não. `profiles` e `user_metadata` ficaram iguais, e a sessão aberta pela conferência foi encerrada. No navegador, salvar o nome mostrou o aviso e atualizou o menu na hora, sem erro no console. **Não conferido:** a largura de celular.

## 2026-11-10: Ganchos primeiro, com notas e comunidade

**Pedido:** na página de roteiros e ganchos, os ganchos vêm antes e com mais destaque. As alunas dão nota de 1 a 5 aos ganchos e registram os delas, com o tipo que escolherem, numa lista "Ganchos da comunidade". A admin edita e apaga os ganchos.

**O que mudou:**
- **Os ganchos foram para o banco.** Para a admin editar e apagar os 60 do banco do Studio (e não só os da comunidade), eles saíram de `src/content/hooks-textos.ts` para a tabela `ganchos`, na mesma ordem (migration `20261110020000_ganchos`). Deixaram de ser conteúdo de `/api/conteudo` e saem por `GET /api/ganchos`, com `autenticar()`: continuam fora do JavaScript público.
- `gancho_notas`: uma nota por aluna por gancho (pk composta, upsert). O `GET` devolve a média, o número de notas e a `minhaNota` (do `userId` do token). O autor de um gancho da comunidade nunca sai na rota.
- `POST /api/ganchos`: a aluna registra o dela. O tipo é uma das 3 categorias de antes, e o banco também confere tipo e tamanho (5 a 200). Limite de 10 por dia contra spam, contado no próprio insert (`insert … select … where count < 10`).
- `PATCH`/`DELETE /api/ganchos` começam por `admin()` e entraram no `ADMIN` do `protecao.test.ts`. Na tela, lápis e lixeira só com `isAdmin`; a lixeira pede confirmação.
- **Tela:** "Ganchos" virou a primeira aba e a padrão, com cabeçalho próprio ("Comece pelo gancho, o resto vem.") e a aba ativa com o gradiente do botão principal. A aba agora fica na URL: com ela só no estado, o "Novo roteiro" do menu não trocava de aba quando a página já estava aberta. Links para o gerador levam `?aba=gerador`. A criação do gancho fica no topo, como um botão "Registrar meu gancho" que abre a caixa (pedido da dona depois de ver a tela); ao publicar, a caixa fecha e a tela rola até a comunidade. O menu diz "Ganchos e roteiros". O Studio (gancho do dia e atalhos) lê o mesmo `useGanchos()`.
- O texto das alunas não entra em prompt nenhum, então a regra "nada de texto livre do navegador no prompt" continua intacta.

**Não mudou:** o `BASE_PROMPT` do assistente ainda fala em "60 ganchos prontos" (mudá-lo zera o cache uma vez; fica para quando houver outra mudança no prompt).

**Verificado:** testes, lint e build. No banco local, com rollback: 60 ganchos na ordem antiga, tipo e tamanho recusados pelo banco, nota trocada pelo upsert, nota em gancho apagado → FK (vira 404), notas apagadas junto com o gancho, `authenticated` sem permissão. No navegador (build em `localhost:3005`, conta admin de teste apagada no fim): nota, publicar, editar o tipo, apagar com confirmação e o "Novo roteiro" trocando de aba; console sem erro. **Falta conferir** a largura de 390 px (o redimensionamento da janela não funcionou).

## 2026-11-10: Abas dos Campeões criadas pela admin

**Pedido:** as abas não ficam mais só nas 5 categorias fixas. A admin cria as abas por um botão na tela, numa tabela nova, e toda inserção confere antes se o pedido é mesmo de admin.

**O que mudou:**
- Tabela `nichos` (`slug` pk, `rotulo`, `criado_em`), já com as 5 abas antigas na mesma ordem. `campeoes.nicho` virou FK para `nichos.slug`, sem cascade: aba com vídeo não pode ser apagada, nem por engano.
- `/api/nichos`: `GET` com `autenticar()`; `POST` e `DELETE` começam por `admin()` (token, acesso e a tabela `admins` no banco), antes de ler o corpo ou a URL. As duas entraram no `ADMIN` do `protecao.test.ts`, e o teste da rota confere que a última consulta da aluna é a checagem de admin.
- O slug sai do nome (`slugDe`, sem acento e com hífen); o banco confere o formato. Nome repetido = 409. Apagar só funciona com a aba vazia (`delete … where not exists`), senão 409.
- `POST /api/campeoes` confere se a aba existe antes de gravar (a FK também segura). `src/content/nichos.ts` saiu, e as telas (Campeões e início) leem as abas por `useNichos()`.
- Na tela, "Nova aba" e "Apagar a aba" só aparecem com `isAdmin`; quem bloqueia é o servidor.

**Verificado:** testes, lint e build. No banco local: as 5 abas na ordem antiga, slug fora do formato recusado, vídeo em aba inexistente recusado pela FK, aba com vídeo não apagada e aba vazia apagada.

## 2026-11-10: Campeões cadastrados pela admin; roteiro sem vídeos

**Pedido:** os vídeos da aba de Campeões passam a ser escolhidos pelas admins, sem busca automática, com a checagem de admin no servidor. O roteiro deixa de mostrar os vídeos sobre o produto: fica só o roteiro.

**O que mudou:**
- Tabela `campeoes` (`nicho`, `url`, `titulo`, único por nicho + URL). O banco só aceita `https://www.tiktok.com/@perfil/video/<id>`, então nem um insert errado no servidor grava outro tipo de link.
- `/api/campeoes`: `GET` com `autenticar()` (toda aluna com acesso), `POST` e `DELETE` com `admin()`, que confere `admins` no banco a cada chamada. As duas entraram no conjunto `ADMIN` do `protecao.test.ts`.
- `urlDoTiktok` (`src/lib/video.ts`) limpa a query e recusa link curto (`vm.tiktok.com/…`): resolver o link curto exigiria o servidor chamar o TikTok. A admin cola o link do navegador.
- Na tela, o formulário e o "Remover" só aparecem com `isAdmin`; quem bloqueia é o servidor.
- Saíram `src/lib/videos-tiktok.ts`, a `BRAVE_API_KEY`, `videos_cache` e `campeoes_cache` (migration `20261110000000_campeoes`), e a seção de vídeos do gerador. Roteiros salvos antes ainda têm `videos` no JSON, que a tela ignora.

**Verificado:** testes, lint e build. No banco local: link `javascript:` recusado pela restrição, o mesmo vídeo duas vezes no nicho não entra, e os dois caches não existem mais.

## 2026-11-09: Treinamento da IA — RAG com as respostas da expert

**Pedido (dona do produto):** as respostas do assistente ainda não soam como a especialista. A ideia veio do `../whatsappBot` (FAQ semântico + fila de Treinamento): a expert responde perguntas do jeito dela, e as perguntas novas saem com o mesmo tom, as mesmas frases e as mesmas gírias. Só admin acessa a página, e o servidor confere isso de um jeito que não dá para burlar. Design: `docs/superpowers/specs/2026-11-09-treinamento-ia-design.md`; plano: `docs/superpowers/plans/2026-11-09-treinamento-ia.md`.

**Como ficou:**
- **Admin:** tabela `admins` (só pelo painel do Supabase) e guarda `admin()`, que roda o `autenticar()` e confere a tabela no banco a cada chamada, sem cache e sem nada do navegador ou do JWT. O `GET /api/acesso` devolve `admin: true` só para o menu.
- **Fila** (`treinamento`, pgvector 1536):
  - perguntas **mapeadas** (25, gravadas pela migration);
  - **conversas de alunas**: cada conversa do assistente é um item só, com as perguntas em ordem e o que a IA respondeu;
  - **criadas** pelo botão "Nova pergunta".

  A expert responde uma por uma (o editor já vem com a resposta da IA) ou descarta. Cada pergunta mostra a respondida mais parecida (≥ 0,6), que dá para editar ali mesmo. A linha não tem `user_id` de aluna. A conversa (`treinamento_conversas`) é sempre o par (`user_id` do token, id gerado pelo navegador), então uma aluna não pendura pergunta na conversa de outra.
- **Contexto no embedding:** a pergunta é indexada junto com as 2 anteriores da conversa, e a busca usa o mesmo formato. Assim uma pergunta solta ("e quanto tempo?") sabe do que fala.
- **Assistente:** busca as 4 respondidas mais parecidas.
  - **≥ 0,9:** a IA recebe a ordem de repetir a resposta da expert quase palavra por palavra, só ligando com a conversa ou acrescentando um detalhe.
  - **≥ 0,7:** as respostas entram como modelo de tom.

  A resposta sempre passa pela IA, então o stream, o limite, o custo e a citação não mudam. O bloco vai no fim do prompt, e o cache continua valendo. Se o embedding falhar, o assistente responde como antes.
- **Modelo de embedding:** `openai/text-embedding-3-small`, o do whatsappBot, que a conta já aceitava.

**Verificado:**
- Testes, lint e build.
- As consultas SQL foram rodadas no Postgres local, com rollback: ligação de parecidas sem apontar para si, busca, e conversa com `ordem` 1 e 2.
- No navegador, com o build em `localhost:3005` e uma conta de teste (apagada no fim, junto com os dados):
  - as 25 mapeadas aparecem;
  - a resposta foi salva e indexada com a OpenRouter de verdade;
  - no assistente, "como eu ativo a conta de afiliada no tiktok shop?" deu **0,966** contra a mapeada respondida. A IA repetiu a resposta da expert e acrescentou requisitos e citações (Aula 5);
  - a conversa virou um item com as 2 perguntas em ordem e a ligação "Parecida com… (97%)";
  - sem a linha em `admins`, o menu some e a página só mostra o aviso;
  - 390 px sem rolagem lateral; console sem erro.

**Achado para a calibragem:** a pergunta solta "e se eu tiver menos de 2 mil?", indexada junto com a anterior ("como eu ativo a conta…"), deu **0,781** contra a resposta sobre ativar a conta. Passou do 0,7 e entrou como modelo. O assunto é próximo (2 mil é requisito), mas o contexto pesa bastante no vetor. Se isso puxar respostas erradas, há três caminhos: usar só 1 pergunta anterior; buscar com e sem contexto e ficar com a melhor; ou a expert reescrever a pergunta deixando-a completa (o embedding é refeito ao editar). Os limiares 0,9 / 0,7 / 0,6 são os de partida e devem ser medidos com uso real.

**Texto de aluna no prompt (decisão da dona do produto):** aprovar uma pergunta de aluna põe o texto dela, e a resposta da IA se aprovada, no prompt de outras alunas. Os riscos são dado pessoal (@, cidade, valores, detalhes da conversa) e instrução escondida ("ignore as regras…"). A expert continua sendo o filtro, agora com aviso: numa pergunta de aluna, o editor pede uma pergunta genérica e nada pessoal, e não há mais aprovação direta: depois do teste da dona, o botão "Aprovar a da IA" saiu, e "Responder" abre o editor já com a resposta da IA dentro, para a expert mudar só o que quiser. Isso também resolve o corte silencioso de respostas com mais de 4.000 caracteres: o contador fica vermelho e bloqueia o salvamento. A exceção à regra "nada de texto livre do navegador no prompt" está registrada no CLAUDE.md. Descartado: tirar a pergunta do prompt, porque o modelo perderia a referência de qual dúvida a resposta atende.

**Efeito no cache** (estimativa com os números de 2026-11-04):
- o preset, o material e a base continuam no cache;
- o bloco da expert e a conversa depois dele saem do cache: ~US$ 0,00002 por pergunta num bloco típico e ~US$ 0,0001 no pior caso;
- editar respostas da expert não zera o cache.

**Fora do material, responder mesmo assim (pedido da dona após teste):** a aluna perguntou "Quantos seguidores preciso para ativar a conta?" (resposta certa, Aula 5) e depois "mas e se levar mais de 48horas?". A segunda resposta abriu com "Aí o material não cobre, tá?", porque a regra do `BASE_PROMPT` mandava dizer isso. O conteúdo que veio depois era útil (conferir o status no app e falar com o suporte). Agora a regra é: usar primeiro o material e, fora dele, responder com o que se sabe em geral, dizendo com naturalidade que aquela parte não está nas aulas. A resposta nunca abre com "não cobre", não atribui à Ana o que não está nas aulas, não cita aula nessa parte e não dá número, prazo ou regra inventados como certos. A regra de assunto passou de "fora do TikTok Shop e do material" para "fora do TikTok Shop e da vida de criadora". Isso não é busca na internet: é o conhecimento geral do modelo. Mudar o `BASE_PROMPT` zera o cache uma vez.

**Achado fora do escopo:** no ambiente local, o assistente falhou com `Preset "ana-shop-studio-leads-behaviorAPPLYFY_WEBHOOK_TOKEN=" not found`. Pelo nome, falta a quebra de linha depois de `OPENROUTER_PRESET` no `.env.local`, o que também deixa o `APPLYFY_WEBHOOK_TOKEN` sem valor. O teste rodou com o preset passado na linha de comando.

---

## 2026-11-09: Redesign 2.0 — roteiros no centro

**Pedido (dona do produto):** a oferta é o gerador de roteiros, mas a primeira tela abria em "Mentalidade de Shop Girl" e "Semana 1". Funciona para quem está começando, não para quem já vende e veio pela ferramenta. A interface precisa servir aos dois públicos e conduzir a aluna para dentro da plataforma.

**O que mudou:**
- **Início virou "Studio":** o gerador está na primeira dobra ("O que a gente vai vender hoje?"): produto + formato → `/app/roteiros?produto=…&formato=…&gerar=1`, que gera na hora e limpa a URL (não gera de novo ao recarregar). Depois: gancho do dia (do banco, com "outro"), últimos roteiros salvos, nichos dos campeões e atalhos (ganchos, IA, mural).
- **Dois públicos:** seletor "Tô começando / Já vendo" no topo. Começando: a trilha vira uma faixa discreta logo depois do gerador. Já vendo: a mesma faixa vai para o fim. (Os cartões grandes de trilha e semana 1 saíram do início a pedido da dona.) Sem escolha, quem tem 0 capítulos lidos cai em "começando". A escolha fica no `localStorage` (`shopstudio:modo`), por ser só conveniência.
- **Menu:** grupos "Criar" (Studio, Roteiros e ganchos, Vídeos campeões, Pergunte pra IA) e "Aprender" (Trilha do zero com x/12, Checklist, Mural), botão "Novo roteiro" em destaque. "Capítulos" virou "Trilha do zero" na tela.
- **Celular:** barra inferior com o "+" de criar no meio (some no assistente, que tem a caixa presa no rodapé). O menu lateral agora fecha ao navegar (bug conhecido resolvido).
- **Gerador:** passos numerados, formatos em cartões com emoji, roteiro pronto em destaque com as 4 etapas, 5×5 em cartões coloridos (toque na frase copia), barra fixa de salvar/outra versão, biblioteca em cartões com o gancho. `?aba=ganchos` abre o banco; Campeões aceita `?nicho=`.
- **Visual:** a paleta original (rosa + chocolate) foi mantida a pedido da dona; mudaram as fontes (ver CLAUDE.md), os raios, os cartões e os destaques. `--lilac`, `--butter` e `--mint` são tons auxiliares tirados da mesma paleta. `src/content/formatos.ts` guarda os formatos e as sugestões de produto (rótulos, sem segredo).

**Não mudou:** rotas de API, regras de acesso, conteúdo protegido, limites. O `marquee.tsx` ficou sem uso.

**Verificado:** prévia renderizada no Chrome (desktop 1440 e celular 390) com dados falsos. **Falta rodar** `pnpm test && pnpm lint && pnpm build` (o ambiente do redesign estava sem acesso ao npm).

---

## 2026-11-06: Preset da voz com as instruções da Ana

**Pedido:** a equipe da Ana mandou um PDF com instruções para a "IA da Ana" (10 páginas). Ver o que melhora no preset da OpenRouter. O PDF e o texto do preset ficam fora do repositório.

**O que entrou no preset** (de ~2.200 para ~5.100 tokens, dentro do cache):
- roteiro na voz da aluna, não da Ana, com o formato de entrega do PDF (formato, gancho, meio, CTA, descrição, duração), gancho = ângulo + entrega, a "dívida do gancho", os 4 roteiros dos campeões e o que funciona por tipo de produto;
- avaliação de gancho: diz se funciona, escolhe uma entre duas opções e muda o mecanismo, não só as palavras;
- regras: verdade antes de criatividade, storytelling só com história verdadeira, escassez só no condicional, marca concorrente nunca aparece, música liberada, provocação só se a aluna pedir, e outro tom quando ela mostra sofrimento de verdade;
- orientações que não estão nas aulas: no mínimo 7 vídeos por dia; não sugerir compra de seguidores (a Aula 7 fala dela);
- uma lista contra a "cara de IA": abrir elogiando, fechar com resumo ou promessa, travessão, vocabulário de coach;
- as próximas melhorias da voz da entrada de 2026-11-05: citações que se repetiam erradas (Aula 10, dossiê), peso das marcas mais frequentes e primeira pessoa.

**Adaptado, não copiado:**
- "Shop Club" virou Shop Studio.
- As 3 perguntas antes do primeiro roteiro viraram "pergunte só o essencial": cada mensagem gasta uma das 15 do dia, e a assistente não lembra de conversas anteriores.
- "uai" ficou raro: aparece 1 vez na transcrição, contra 420 de "tá?".
- O exemplo de roteiro do PDF inventava um detalhe do produto, contra a própria regra de verdade. Virou indicação de cena.
- Itálico virou aspas (a tela só mostra negrito).
- Do FAQ, só entrou o que é novo; o resto já está na transcrição e no guia.

**Conflito achado:** o capítulo 11 e o `GUIA` ensinavam a publicar "sem som" e vincular o produto depois. É o atalho que a Ana chama de burla na Aula 15 ("é perigoso você levar a punição, então melhor você escolher um som disponível"). No teste, a assistente repetia o atalho mesmo com o preset novo. Corrigidos o capítulo, o `GUIA` e o `METHOD` do roteiro (`tests/content/musica.test.ts`).

**Gerador de roteiros:** ele não usa o preset, então o `METHOD` recebeu as regras do PDF: 5 ângulos de gancho, dívida do gancho, escassez só no condicional, 30 a 50 segundos, verdade antes de criatividade, marca concorrente e nada de insulto.

**Testado** com 7 perguntas, o texto do preset como primeira mensagem de sistema antes do prompt do app (`ai_knowledge` vazio), mesmos provedores e parâmetros. Custo total ~US$ 0,02.

| Pergunta | Preset antigo | Preset novo |
|---|---|---|
| Quantos vídeos por dia? | "não tem regra" | "no mínimo 7" |
| Vale comprar seguidores? | "compra um pouquinho a mais dos 2 mil" | "não, vai contra as regras do TikTok" |
| A música não aparece com o produto | ensinava o atalho | "não vale burlar" (depois da correção do guia) |
| Roteiro para tímida, sem rosto | lista, gancho no jeito da Ana | formato do PDF, só as mãos e narração, preço "confere no carrinho" |
| Qual de dois ganchos? | escolhia e reescrevia no jeito da Ana | escolhe e pergunta se a história é verdadeira |
| Travessões / listas numeradas (7 respostas) | 9 / 15 | 0 / 3 |

O provedor (Morph) e o custo por pergunta com cache (US$ 0,0004 a 0,0008) não mudaram.

**Ainda acontece:** o roteiro às vezes inventa um motivo da aluna ("parei de gastar com café na cantina"), mesmo pedindo os detalhes reais no fim; "jornada" apareceu 1 vez em 14 respostas; "Boa," como abertura.

**Pendente com a Ana:** as expressões e a frequência do "uai"; compra de seguidores; menor de idade (ficou a versão da aula, o PDF tem uma mais cautelosa); as aulas 11, 16, 17 e 18, que também faltam aqui; o guia "100 ganchos para vender", que não está no material; e a persona do `ai_config`, que ainda entra no gerador de roteiros, enquanto o PDF quer o roteiro na voz da aluna.

---

## 2026-11-06: Campeões por nicho, com os vídeos mais engajados

**Pedido:** a tela de Campeões deixa de depender do cadastro da administração e ganha abas por nicho, com termos femininos e de venda. Cada aba mostra os vídeos de **produto** com mais engajamento (não qualquer vídeo do tema), iguais para todas as alunas, num cache de 1 dia sempre renovado. 5 abas e 10 vídeos por aba para começar.

**Abas:** moda fitness, beleza e maternidade (pedidas) e casa e cozinha e moda feminina (escolha nossa: achadinhos de casa e roupa feminina são dos nichos mais fortes do TikTok Shop no Brasil). Ficam em `src/content/nichos.ts`, com as buscas e as palavras de cada uma.

**Testes reais** (15 buscas, uma rodada por aba): cada aba junta de 40 a 55 vídeos; os 10 primeiros vão de ~5 mil a ~500 mil curtidas, quase todos em português e de compra (Shopee, Shein, provador, achadinhos). Ajustes que o teste mostrou:
- "#modamasculina" aparecia em moda feminina: tudo que tem "masculin" sai.
- "mãe" puxava "viagem em família com minha mãe": saiu das palavras de maternidade.
- O filtro de sinal de venda quase não corta (as buscas já pedem achadinho/comprei), mas fica de proteção: tirou "enxoval: o que é realmente necessário", que é dica, não venda.

**Como ficou:**
- `buscarCampeoes` reaproveita a busca e a ordem do roteiro (goggle de só vídeos, curtidas + 3 × comentários, português primeiro), com outro filtro (`doNicho`) e até 10.
- `campeoes_cache`, uma linha por nicho. Mais de 1 dia = quem abrir a aba busca de novo (espera ~0,5 s) e grava. Brave sem resultado = fica o que estava salvo, mesmo vencido. Custo máximo: 5 nichos × 3 buscas = 15 por dia.
- Sem cron: a renovação acontece quando alguém abre a aba vencida. Se a espera incomodar, um cron resolve.
- O cartão de vídeo do roteiro virou `CartaoTiktok` (`video-embed.tsx`), usado nas duas telas.

**Avaliado para as abas mudarem sozinhas:** o feed "em alta" do Google para o Brasil (RSS) só traz notícias e famosos e não filtra por categoria; a API oficial do Google Trends está em teste fechado. DataForSEO e SerpApi dão as buscas em alta relacionadas a um termo, inclusive no Google Shopping, por ~US$ 0,002 por consulta ou no plano grátis, mas coletam do Google por conta própria e ainda não foram testadas. Ficou para depois, com as abas fixas.

**Verificado:** testes, lint e build. Com o build em `localhost:3005`, uma conta de teste (apagada no fim) e a Brave de verdade: as 5 abas com 10 vídeos cada; na segunda rodada, todas do cache (~7 ms); nicho inválido = 400. O `next dev` que já estava rodando guardou a versão antiga do módulo e deu 500 (`buscarCampeoes is not a function`); reiniciar o dev resolve. **No navegador** (1440 px): com 5 colunas os vídeos tinham 164 × 294 px, pequenos demais; passaram a 3 colunas no computador, 2 no tablet e 1 no celular, e ficam com 281 × 501 px (o player do TikTok vai até 320 px). Play, troca de aba e console sem erro conferidos. Depois de testar no celular, a dona do produto pediu o mesmo grid nos vídeos do roteiro (eram 2 por linha, pequenos): a 400 px, 1 por linha com 316 × 563 px, sem rolagem lateral. A largura de celular não foi vista: a janela não aceitou o redimensionamento e a CSP (`frame-ancestors`) impede simular num iframe.

---

## 2026-11-06: Cache dos vídeos do roteiro por termo parecido

**Pedido:** não gastar 3 buscas da Brave toda vez. Alunas pedem produtos parecidos, então o resultado de uma pode servir para outra, por um tempo limitado (3 dias).

**Como ficou:**
- **Chave:** `normalizarTermo` tira acento, palavras vazias ("de", "da", "kit"…) e o plural, e ordena as palavras: "Sérum de Vitamina C" e "sérum vitamina c" viram `c serum vitamina`.
- **Tabela `videos_cache`** (`termo` como chave, `videos` jsonb, `criado_em`), compartilhada e sem `user_id`, porque guarda só URLs públicas do TikTok. O termo nunca volta para a tela.
- **Busca:** o termo salvo mais parecido, de menos de 3 dias, com `extensions.similarity` (pg_trgm) ≥ **0,7**. Achou: devolve sem chamar a Brave. Não achou: 3 buscas e grava (`on conflict` sobrescreve o vencido).
- Lista vazia não é gravada, para uma falha da Brave não ficar presa 3 dias. Banco fora do ar = busca na Brave, como antes.
- Sem índice de trigramas: uma linha por termo, alguns milhares no máximo.

**Calibração do limiar** (16 pares, `similarity` sobre o termo normalizado):
- Mesmo produto: "…30ml" 0,77; "escova secadora alisadora" 0,77; "garrafa térmica 1 litro" 0,67; "…principia" 0,63; "airfryer" 0,58; "air fryer mondial 4L" 0,48.
- Produto diferente: protetor solar facial × corporal 0,53; garrafa térmica × de água 0,38; pijama feminino × masculino 0,38; escova alisadora × de dente 0,30.
- A dona do produto pediu **0,7** para não se distanciar do que foi escrito. Com ele, só reaproveita variações bem próximas (o "…1 litro" e o "…principia" fazem busca nova). Errar para esse lado só custa uma busca. `word_similarity` foi descartada: deixava facial × corporal passar (0,73).

**Verificado:** testes, lint e build. Com o banco local e a Brave de verdade: "garrafa térmica stanley" fez 3 buscas; "Garrafa Térmica da Stanley" e "garrafa termica stanley 1L" vieram do cache (0 buscas); "garrafa de água" fez 3 buscas. No SQL, a linha de 4 dias não volta e a de 2 dias volta. As linhas de teste foram apagadas.

---

## 2026-11-06: Vídeos do roteiro pelos mais engajados

**Problema:** os vídeos embaixo do roteiro eram relevantes, mas fracos: a ordem era a do buscador, sem saber quantas pessoas viram ou curtiram.

**O que a Brave já trazia:** com `extra_snippets=true`, a página de cada vídeo vem com o texto que o próprio TikTok publica: `19.1K Likes, 120 Comments. TikTok video from…`. Visualizações não aparecem ali. Curtidas e comentários são o melhor sinal de engajamento sem scraping.

**Testes reais** (58 buscas, 6 produtos: air fryer, sérum vitamina c, escova alisadora, pijama feminino, garrafa térmica, protetor solar facial):
- **Goggle** (`goggles`, regra inline `$discard` + `/video/`): descarta as páginas `/discover`, que ocupavam metade dos 20 resultados. 1 busca com goggle rende o mesmo que 3 páginas (`offset` 0/1/2) sem ele. Com goggle, o `offset` não traz mais nada.
- **`OR` funciona** (não está na documentação, que lista `""`, `-`, `site:` e `filetype:`). `site:tiktok.com/@` volta 0; `-discover` não muda nada; o termo `tiktok shop` volta 0 vídeos; `freshness=py` só traz `/discover` (com goggle, 0).
- **Termos diferentes rendem mais que páginas:** 3 buscas com termos diferentes juntam 41 a 56 vídeos únicos por produto; 3 páginas do mesmo termo, 5 a 30.
- **Relevância:** com mais termos, vinha perfume e hidratante na busca de pijama. Exigir 60% das palavras do produto (sem acento e sem plural) no título ou no texto resolveu.
- **Mediana de curtidas dos 6 mostrados, antes → depois:** sérum 756 → 20,1 mil; garrafa 2,6 mil → 42,7 mil; protetor 11,1 mil → 38 mil; air fryer 19,1 mil → 26,4 mil (o pior foi de "sem número" a 14,2 mil); escova igual (104,7 mil), mas o pior foi de "sem número" a 3,5 mil. **Pijama continua fraco:** a Brave indexa poucos vídeos de moda com número.

**Mudança** (`src/lib/videos-tiktok.ts`):
- 3 buscas em paralelo com o goggle: `(resenha OR "vale a pena" OR testei)`, `(achadinho OR comprei OR amei)` e `(review OR unboxing OR favorito)`. Uma que falha não derruba as outras.
- Nota = curtidas + 3 × comentários. Português e idioma indefinido primeiro, por nota (sem número no fim), depois no máximo 2 em outra língua. Até 6.
- **Custo:** 3 buscas por roteiro em vez de 1 (~US$ 0,015 com a Brave a US$ 5 por 1.000). Continua dentro do limite de 10 roteiros por dia.

**Avaliados e deixados para depois:** Kalodata, FastMoss e EchoTik têm visualizações e vendas (GMV) reais por vídeo, inclusive do Brasil. Mas coletam os dados do TikTok por conta própria (o mesmo motivo do descarte do Apify em 2026-11-05) e cobram: Kalodata só tem API no plano Enterprise (~US$ 570/mês); FastMoss cobra a partir de US$ 0,01 por chamada; EchoTik dá 100 chamadas grátis e planos de 10 mil a 30 mil chamadas. Só vale se as curtidas não bastarem, e depende de a dona do produto aceitar dados coletados por terceiros.

---

## 2026-11-05: Estilo do assistente fica com a especialista

**Problema:** as respostas não soavam como a especialista. O `BASE_PROMPT` tinha regras fixas de estilo ("tom de amiga experiente", "no máximo 5 frases", "vá direto à ação"), e a persona do `ai_config` dizia que "as regras acima nunca podem ser contrariadas". Assim, qualquer instrução de voz perdia para o tamanho e o tom fixos.

**Mudança:** o prompt agora separa **regras de conteúdo**, que valem sempre (só o material, citar a aula, não copiar, não prometer ganhos, fora de assunto), de um **estilo padrão**, que vale só sem instruções da especialista. Essas instruções podem vir do `ai_config` ou de outra mensagem de sistema (preset da OpenRouter) e mandam no tom, no vocabulário e no tamanho das respostas. O prefixo continua idêntico para todas as alunas, então o cache segue valendo.

**Preset da OpenRouter** (`OPENROUTER_PRESET`, só no assistente): só o system prompt, com a voz da Ana, tirada das aulas e do dossiê. Roteamento de provedores, `temperature` e `max_tokens` continuam no código. Sem tools e sem busca na web. O cache do DeepSeek é automático. O roteiro (JSON) nunca usa o preset.

**Testado na OpenRouter** (6 perguntas, mesma chamada do app):
- O campo `preset: "slug"` no corpo é **ignorado sem erro**. Só funciona no nome do modelo: `<modelo>@preset/<slug>`.
- O prompt do preset entra **antes** do nosso. Prova: o cache zerou na primeira chamada e voltou nas seguintes, com o preset e o material juntos.
- O provedor (Morph) e o custo (~US$ 0,0004 por pergunta com cache) não mudaram. O preset soma ~2.200 tokens.
- **Voz:**
  - antes, as respostas vinham com "gnt", "pq" e 🎀 (da persona do `ai_config`) e sempre terminavam em "Próximo passo:";
  - com o preset e sem a persona, apareceram "tá?", "minha filha", "pelo amor de Deus", a dúvida antecipada e o acolhimento seguido do puxão de orelha;
  - com o preset e a persona juntos, as duas brigavam (o "gnt" voltava e as respostas encurtavam).
- Por isso, com o preset ligado, a persona do `ai_config` não entra no assistente. Ela continua no roteiro.
- **Segunda versão do preset:** a primeira criou um bordão novo ("Bora…, combinado?" em quase toda resposta) e entregava ganchos reais da Ana prontos. A segunda pede fechamentos variados, citação da aula de onde a informação saiu e ganchos novos (o do dossiê só como mecanismo). O bordão sumiu e o gancho passou a ser novo.

**Resultado medido** (marcas de fala nas 6 respostas, ~700 palavras em cada rodada):

| Marca | Na transcrição | Antes | Com o preset |
|---|---|---|---|
| "tá?" | 420× | 0 | 6 |
| "minha filha" | 32× | 0 | 3 |
| "ó," | 119× | 0 | 2 |
| "gnt", "pq" | nunca | 6 | 0 |
| 🎀 / "Próximo passo:" | nunca | 2 / 4 | 0 / 0 |

Também apareceu a postura das aulas 1 a 3: acolher e dar o puxão de orelha, "para de se comparar", o combinado 50 a 50, antecipar a dúvida da aluna e devolver uma pergunta prática. O conteúdo seguiu igual: sem promessa de prazo e dizendo quando o material não cobre o assunto.

### Próximas melhorias da voz

**1. Citações trocadas.** O modelo acerta a informação, mas às vezes põe a citação da aula errada, e uma citação errada derruba a confiança da aluna na resposta inteira.
- "Produto diferente do link dá restrição" saiu como Aula 6 em três rodadas seguidas. Isso está só na Aula 10. A regra genérica do preset ("cite a aula de onde a informação saiu") não resolveu.
- Os vídeos campeões de pijama foram citados como "Aula 15", mas estão no dossiê (a transcrição nem tem a palavra "camisetão").
- **Causa provável:** o modelo associa o assunto da pergunta (link no vídeo) à aula daquele assunto e cola ali uma informação que veio de outra. Com ~78 mil tokens de material, isso é esperado num modelo rápido.
- **Caminhos, do mais barato ao mais caro:**
  1. linhas específicas no preset para os erros que se repetem (ex.: "restrição é da Aula 10"; "vídeos campeões estão no dossiê, cite 'dossiê'");
  2. marcar no próprio material de onde vem cada parte, para o dossiê nunca parecer aula;
  3. conferir no servidor se a aula citada contém os termos da frase. Isso exige um índice e só vale se os casos 1 e 2 não bastarem.

**2. Marcas que ainda faltam.** "né?" (213× na transcrição) e "gente" como chamamento (302×) quase não aparecem: o modelo prefere "amiga" e "tá?". O preset lista as duas, mas sem peso. Dá para dizer quais são as mais frequentes e pedir que apareçam. Cuidado com o exagero: as mesmas marcas em toda frase soam como caricatura, e já aconteceu com o "combinado?".

**3. Erros da transcrição automática.** "Shopp girls" (2×) e "shopping girl" (4×) foram repetidos pelo modelo ("Shopp Girls"). Corrigir para "Shop Girl" direto no `transcricao.md`, o que zera o cache uma vez.

**4. Primeira pessoa.** Uma resposta disse "eu gosto de deixar clarinho", uma preferência da Ana dita como se fosse da assistente. O preset proíbe contar as experiências dela como próprias, mas nem sempre o modelo obedece. Vale acompanhar.

**5. Avaliação repetível.** Por enquanto a comparação é feita à mão, com 6 perguntas. As ~20 perguntas de referência (ideia já em aberto) deveriam virar um script no repositório, com a contagem de marcas e a conferência das citações. Assim cada mudança no preset ou no prompt é medida, e não só lida.

**Como testar:** chamar a OpenRouter com o mesmo prompt do app (`buildAssistantSystemPrompt`), os mesmos provedores e os mesmos parâmetros, com `<modelo>@preset/<slug>`. Depois de editar o preset, a primeira chamada tem que vir com o cache zerado. Se não vier, a versão nova não entrou.

---

## 2026-11-05: Vídeos do TikTok embaixo do roteiro

**Pedido:** depois de gerar o roteiro, mostrar vídeos do TikTok sobre aquele produto. Não precisam ser os mais recentes, mas os mais relevantes, de preferência em português, deixando claro que é uma amostra.

**Opções avaliadas:**
- **Scraping do TikTok:** os termos de uso proíbem coleta automatizada sem autorização, e o anti-bot quebra o scraper com frequência. Descartado. Serviços de terceiros (Apify, ScrapeCreators…) fazem o mesmo por baixo.
- **APIs oficiais:** a Research API é só acadêmica e sem fins comerciais; a Display API mostra só os vídeos da própria conta; a API de parceiros do TikTok Shop exige aprovação como empresa e não tem busca de vídeos conhecida.
- **Embutir a busca do TikTok:** impossível, porque a página responde `x-frame-options: SAMEORIGIN`. O TikTok só deixa embutir um vídeo por vez (ou um perfil).
- **Google Custom Search:** fechada para clientes novos e desligada em 2027-01-01.
- **Brave Search API + player oficial:** escolhida. O buscador acha as URLs e o vídeo toca no player do TikTok, que é permitido.

**Testes reais com a Brave** (~60 buscas, 12 produtos):
- Com filtro de data (`freshness`) só voltam páginas `/discover`, que não dá para embutir. Sem ele, os vídeos vêm, mas de 2022 a 2026: o índice não acompanha o que acabou de sair.
- O endpoint de vídeos da Brave não traz nada do TikTok; só o de web.
- Acrescentar **"resenha"** ao termo foi o que mais ajudou: air fryer foi de 1 para 10 vídeos em português, e o sérum de vitamina C (o pior caso, cheio de vídeos em espanhol) de 1 para 4. `country=BR` + `search_lang=pt-br` ajudam um pouco.
- O campo `language` da Brave erra (marcou título em português como `en`). Por isso o idioma sai de uma heurística por palavras do título. Os trechos extras foram ignorados, porque vêm com texto em inglês ("TikTok video from…").
- Resultado final: 3 a 6 vídeos por produto, quase todos em português e sobre o produto.

**Decisões:**
- A busca roda **dentro de `/api/roteiro`**, em paralelo com a IA: não atrasa, usa o mesmo limite diário (protege a cota da Brave) e não precisa de rota nova.
- Falha da Brave ou falta da chave nunca derruba o roteiro.
- Até 6 vídeos, português primeiro, no máximo 2 em outra língua, marcados com "outro idioma".
- A tela tem também o link "Ver os mais recentes no TikTok" (busca do próprio TikTok), para quem quer o que acabou de sair.
- Os vídeos vão junto quando o roteiro é salvo; como o salvo volta do navegador, a tela só mostra URLs do TikTok.
- **Capa dos vídeos:** a miniatura da Brave aponta para a página do vídeo e dá 422, e o oEmbed do TikTok não traz mais `thumbnail_url` (só o HTML do player). Por isso a seção carrega o próprio player já (`previa` no `VideoEmbed`, sem autoplay, iframe lazy), que mostra a capa. Nos capítulos e campeões continua o toque para carregar.
- O título embaixo de cada vídeo é link para o vídeo no TikTok.

**Verificado:** testes, lint e build. No navegador, com uma conta de teste (apagada no fim): roteiro de "escova alisadora de cabelo" com 6 vídeos em português, o player do TikTok tocando sem erro de CSP, e a tela em 375 px com 2 colunas.

---

## 2026-11-05: Login por e-mail + senha, conta criada por webhook

**Pedido:** tirar o login social e usar e-mail + senha (JWT). A conta da cliente é criada por um webhook da plataforma de venda, com uma senha temporária; no primeiro acesso ela define a sua. A marca de "senha temporária" não pode ser pública nem visível pelo console. A compra já libera o acesso. Como a senha temporária chega à cliente fica para depois (serviço de e-mail), então por enquanto o webhook só a devolve.

**Decisões:**
- **Supabase Auth, não JWT próprio.** O token do Supabase já é um JWT, e a senha é guardada com hash bcrypt pelo próprio Supabase. Montar um login próprio só duplicaria isso.
- **Cadastro público desligado** (`enable_signup = false`), com o provedor de e-mail ligado só para o login. Isso mantém fechado o achado 1 da auditoria (conta criada com a anon key). O teste de configuração passou a exigir isso.
- **Marca numa tabela, não no `app_metadata`:** os metadados do usuário vão dentro do JWT, que fica no `localStorage`. A tabela `senhas_temporarias` não tem privilégio para `anon`/`authenticated`, e a tela só recebe `trocarSenha: true/false`.
- **Criação atômica:** a marca e o `entitlement` vão numa consulta só (CTE). Se ela falhar, o usuário criado é apagado, para não sobrar uma conta com a senha temporária valendo como definitiva.
- **Segredo + CORS:** a pessoa pediu que só a origem da plataforma tenha acesso, configurável (`WEBHOOK_CONTA_ORIGENS`). O `Origin` sozinho não protege, porque um servidor não manda e um `curl` forja. Por isso o segredo `WEBHOOK_CONTA_SEGREDO` é obrigatório, comparado em tempo constante.
- **`POST /api/senha` só com a senha temporária pendente:** sem pedir a senha atual, um token roubado não serve para trocar a senha de quem já definiu a sua.
- Senha nova com no mínimo 6 caracteres, igual ao `minimum_password_length` do Supabase. E-mail já cadastrado responde 409.

**Achado no teste ponta a ponta:** trocar a senha pela API admin **derruba as sessões abertas**, e o token antigo passa a receber 401. A tela de definir senha agora entra de novo com a senha nova logo depois da troca.

**Saiu:** o botão e o fluxo do Google, o `[auth.external.google]` do `config.toml`, as variáveis `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` e o `flowType: "pkce"`.

**Verificado:**
- Testes, lint e build sem avisos.
- Ponta a ponta no Supabase local:
  - cadastro pela anon key → `signup_disabled`;
  - webhook sem segredo → 401, com origem estranha → 403, repetido → 409;
  - login com a temporária, com a marca fora do JWT;
  - rotas bloqueadas até a troca;
  - depois da troca, a temporária não entra mais e a senha nova entra.
- No navegador: senha errada, senha temporária, "Defina a sua senha" e o painel, sem erros no console. Os usuários de teste foram apagados.

**Ajustes pedidos em seguida:**
- `trocarSenha` só aparece em `GET /api/acesso` enquanto existe a linha da aluna em `senhas_temporarias`. Depois da troca, a resposta é só `{ acesso }`, para que nada mostre que a conta já teve senha temporária. Conferido de novo que o JWT não leva nada disso: o `app_metadata` tem só o provedor.
- **Validade de 30 minutos**, calculada pelo `now()` do banco. Expirada, todas as rotas e a troca respondem 403 e a tela mostra "expirou". Chamar o webhook de novo para o mesmo e-mail gera outra senha e renova o prazo, e a antiga deixa de entrar. O 409 ficou só para quem já definiu a própria senha. Isso foi decisão minha, porque sem ela uma conta expirada ficaria sem saída.
- Verificado no banco real, simulando 31 minutos com um `update` em `criada_em`.

**Blindagem do Supabase** (testado com a chave pública no local):
- **Já estavam fechados:** tabelas e GraphQL (503), storage (listar volta `[]`, enviar e criar bucket dão 403 pelo RLS), admin (403), cadastro e otp (`signup_disabled`).
- **Estavam abertos:** o websocket do realtime e o `/recover`, que manda e-mail de recuperação para qualquer conta existente.
- **Mudanças:**
  - realtime desligado;
  - token de 15 minutos;
  - reautenticação para trocar a senha direto no Supabase;
  - 10 logins a cada 5 minutos por IP;
  - modelos de e-mail de recovery, magic link, troca de e-mail e reautenticação sem link nem código (`supabase/templates/sem-link.html`).
- **Conferido depois de reiniciar:** o websocket não conecta mais, e o e-mail de recuperação chega no Mailpit sem link.
- O checklist do painel de produção foi para o README.

**Fica para depois:** serviço de e-mail (enviar a senha temporária e "esqueci minha senha") e o formato de assinatura da plataforma de venda que for escolhida (hoje é `Authorization: Bearer`).

---

## 2026-11-04: Auditoria de segurança

**Pedido:** testar a segurança antes de ir para produção, com atenção ao login social, aos cookies e à sessão, e corrigir o que aparecesse.

**Contexto importante:** o app **não usa cookies** para a sessão. O Supabase guarda a sessão no `localStorage`, e as rotas de IA recebem o token no cabeçalho. Por isso CSRF não se aplica, mas um script injetado (XSS) conseguiria ler o token. Isso definiu as prioridades.

**Como foi testado:** no ambiente local, com duas contas de teste ("aluna A" e "aluna B") criadas e apagadas no fim. Usei chamadas diretas à API do Supabase com a chave pública (o que qualquer pessoa pode fazer), chamadas às rotas do app e o navegador. Também rodei `pnpm audit`, sem vulnerabilidades conhecidas.

**Achados e correções:**

| # | Gravidade | Achado | Correção |
|---|---|---|---|
| 1 | Alta | Cadastro por e-mail/senha aberto: com a anon key criei `intruso@qualquer.com`, que saiu logada e, com o modo revisão, passava pela checagem do assistente. | `[auth.email] enabled = false`. Cadastro e login por e-mail agora voltam `email_provider_disabled`; o Google segue funcionando. |
| 2 | Média | Nenhum cabeçalho de segurança e `X-Powered-By: Next.js`. | CSP (`connect-src` só app + Supabase, `frame-ancestors 'none'`, `object-src 'none'`…), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS e `poweredByHeader: false` (`src/lib/seguranca.ts`). No navegador, um `fetch` para fora com o token foi bloqueado, enquanto o assistente e as fontes continuaram funcionando. |
| 3 | Média | Gerador de roteiros sem limite (custo). | 10 por dia, contados em `ai_perguntas` com a coluna nova `rota`. O custo dos roteiros também passou a ser registrado. A reserva, a liberação e o custo foram unificados em `api-auth.ts`. |
| 4 | Média | Código de acesso sem limite: 60 tentativas em 1 s. | `redeem_access_code` grava as tentativas erradas (`access_code_tentativas`, sem acesso direto) e bloqueia depois de 10 por hora. A tela mostra a mensagem. |
| 5 | Média | `chapterTitle` em texto livre entrava no prompt de sistema (injeção). O modelo ignorou no teste, mas a brecha existia. | O navegador manda só o slug (`capitulo`), e o servidor busca o título com `getChapter`. Teste cobre o texto malicioso. |
| 6 | Baixa | `midia_url` dos casos de sucesso aceitava qualquer coisa (`javascript:`, `http:` de rastreio) e aparece para todas as alunas. | Constraint `success_cases_midia_https` e aviso na tela. |
| 7 | Baixa | Nada no prompt proibia copiar o material pago (o modelo recusou por conta própria). | Regra explícita no prompt, com teste. |
| 8 | Baixa | Token antigo lê o banco até 1 h depois do logout (as rotas de IA já recusam). | Só documentado: é o padrão do Supabase, encurtável no painel. |

**O que estava seguro:**
- Leitura e escrita cruzadas entre alunas (RLS).
- Tabelas de admin.
- Apagar o próprio histórico para burlar o limite.
- Upload no bucket de vídeos.
- Acesso sem login.
- `?de=` (só aceita `/app…`).
- Fluxo PKCE do Google.
- Ausência de `dangerouslySetInnerHTML`.

**Efeito colateral para quem desenvolve:** sem o provedor de e-mail, testar telas logadas exige ligá-lo temporariamente (o CLAUDE.md explica e alerta para não commitar). Durante a verificação, um 500 em `/api/roteiro` era só o `next dev` com o módulo antigo em memória; reiniciar resolveu.

**Observação fora do escopo:** as respostas do assistente aparecem com `**markdown**` cru, porque a tela mostra texto puro. É só aparência.

---

## 2026-11-04: Bug: a conta nova caía na última página da conta anterior

**Sintoma relatado:** ao entrar com uma conta Google nova, o app parava na última página em que a outra conta estava.

**Investigação:**
- Os logs do Supabase mostraram que **o login em si funcionou**: as duas contas Google foram criadas, a troca PKCE deu certo e os perfis foram gravados com o nome do Google.
- A pista estava no início do segundo login, que partiu de `/entrar?de=/app/assistente`.
- Reproduzido: no assistente, clicar em "Sair da conta" levava a `/entrar?de=%2Fapp%2Fassistente`.

**Causa raiz:** a guarda da área logada (`src/app/app/layout.tsx`) via a sessão sumir e não sabia o motivo. Tratava o "Sair" como uma sessão expirada e guardava a página atual para voltar depois do login. Quem entrasse em seguida, com qualquer conta, era levada para lá.

**Correção:**
- O `AuthProvider` ganhou `saiu`: vira `true` no `signOut()`, antes da sessão sumir, e volta a `false` no próximo `SIGNED_IN`.
- A guarda usa `destinoSemSessao(pathname, saiu)` (`src/lib/navegacao.ts`, com teste): quem clicou em sair vai para `/entrar` limpo, e quem perdeu a sessão sozinha continua voltando para onde estava.
- Conferido que os caches de dados pessoais (progresso, checklist, acesso, perguntas) já eram separados por usuário, então não havia vazamento de dados entre contas.

**Verificado no navegador:** sair do assistente leva a `/entrar`. Abrir `/app/roteiros` sem sessão leva a `/entrar?de=%2Fapp%2Froteiros`.

---

## 2026-11-04: Login só com Google

**Pedido da dona:** deixar apenas o Google como forma de entrar. Na primeira vez, o app cria o acesso; quem já tem conta segue o fluxo normal. Motivo da escolha do Google: é o provedor mais simples de configurar.

**O que mudou:**
- `/entrar` agora tem só o botão "Entrar com Google" (`supabase.auth.signInWithOAuth`). Saíram e-mail/senha, as abas "Entrar/Primeiro acesso", o link mágico, o "esqueci minha senha" e a página `/redefinir`, e com ela o redirecionamento do `PASSWORD_RECOVERY` (que era o único aviso do lint).
- O cliente do Supabase passou a usar **PKCE** (`flowType: "pkce"`): o Google devolve `?code=` e o cliente troca pela sessão sozinho.
- **Primeiro acesso:** o `ensureProfile` já gravava o perfil só uma vez (`ignoreDuplicates`). Agora o nome vem do Google (`full_name`/`name`, em `src/lib/nome.ts`, com teste), e o painel cumprimenta pelo primeiro nome. Depois disso, a aluna segue o fluxo de sempre: código de acesso, ou entrada direta no modo revisão.
- **Supabase local:** `[auth.external.google]` no `config.toml` lê o Client ID e o Secret do `.env.local` (`env(...)`), com `skip_nonce_check = true`, que o Supabase local exige. O `pnpm db:start` agora carrega o `.env.local` antes de subir.
- **Cliente OAuth no Google Cloud** (tipo Aplicativo da Web): origem `http://localhost:3000`; redirecionamento `http://127.0.0.1:54321/auth/v1/callback`. Em produção, origem `https://<domínio>` e redirecionamento `https://<ref>.supabase.co/auth/v1/callback`.
- O provedor de e-mail continua ativo no servidor, só fora da interface, para permitir criar usuários de teste pela API.

**Achado no caminho (corrigido):** duas falhas vinham da migração, ambas porque o Next não tem o `#root` do Vite.
- A tela de entrada não ocupava a altura toda. Corrigido com `min-h-dvh` no lugar de `min-h-full`.
- O menu lateral rolava junto com o capítulo. O `overflow-x: hidden` em `html`/`body` transformava o body em contêiner de rolagem, e o `sticky` deixava de funcionar. Trocado por `overflow-x: clip`, que corta a rolagem lateral do mesmo jeito sem esse efeito.

**Verificado:**
- 52 testes, lint sem avisos, build ok.
- O `/auth/v1/authorize?provider=google` do Supabase local redireciona ao Google com a URI de callback correta.
- No navegador, a tela nova ocupa a altura toda e o menu lateral fica parado ao rolar.
- **Ainda não testado:** a volta do Google com uma conta real, que precisa de uma pessoa logando.

---

## 2026-11-04: Documentação e organização

- Criados `CLAUDE.md` (guia para agentes) e este `DEVLOG.md`. O `README.md` foi refeito.
- **Testes saíram de `src/` para `tests/`,** espelhando a estrutura (`tests/lib/…`, `tests/app/api/…`). O Vitest só procura em `tests/**/*.test.ts`, e os imports usam `@/…`.
- **O material da IA virou `.md` editável e o script `scripts/gerar-conhecimento.py` foi removido** (ver a próxima entrada).

### O script `gerar-conhecimento.py` (removido)

**O que fazia:** transformava os dois documentos de origem, `Shop_Club_Transcricao_Completa.pdf` (89 páginas) e `DOSSIE_DEFINITIVO_SEGUNDA_MENTE_TIKTOK_SHOP.docx`, no texto que a IA recebe. Passos:

1. **PDF → texto** com `pdftotext`. Descartava capa e sumário, ou seja, tudo antes do primeiro marcador `AULA 01` (que no PDF vem precedido de quebra de página `\f`).
2. **Uma seção por aula:** o título vinha da linha "Título original no Panda Vídeo: … .mp4", porque o título da primeira linha quebrava no PDF ("…Central" em vez de "…Central do Criador etc"). O resultado foi `## Aula N - título`.
3. **Limpeza:** removia rodapés ("Shop Club — Transcrição Completa das Aulas"), números de página e a linha de metadados (pasta, duração). Juntava as linhas quebradas pelo PDF em parágrafos.
4. **Marcações de tempo** `m:ss – m:ss` viravam `[m:ss – m:ss]` no início de cada trecho. É isso que permite ao assistente citar "(Aula 7, 3:12)".
5. **Vídeos de venda fora:** "Upsell 1" e "Vídeo Obrigado Upsell" foram ignorados, para o assistente não sair oferecendo upsell.
6. **Troca de nome:** "Shop Club" virava "Shop Studio", incluindo os erros da transcrição automática "Chap Club", "Shopp Club" e "Shopping Club".
7. **DOCX → texto:** lia o `word/document.xml` do arquivo, com uma linha por parágrafo e o mesmo rename.

**Por que foi importante:** sem essa limpeza, o modelo receberia ~250 mil caracteres com sumário, rodapés repetidos a cada página, títulos cortados e o nome antigo da marca. Isso gastaria tokens à toa e faria o assistente citar errado. As marcações de tempo preservadas são o que deixa as respostas verificáveis.

**Por que saiu:** a dona preferiu editar o texto direto daqui para frente. O resultado do script foi mantido em `src/lib/conhecimento/transcricao.md` (39 mil palavras, 16 aulas) e `dossie.md` (5,7 mil palavras). Se vierem novas versões em PDF/DOCX, os passos acima são a receita para refazer a conversão.

---

## 2026-11-04: Cache de prompt e escolha de provedor

**Problema:** com o custo real gravado em `ai_perguntas`, uma pergunta custava **US$ 0,014–0,024**, e não os US$ 0,01 estimados. O cenário de 9 perguntas/dia × 20 dias daria ~R$ 20 por aluna, cerca de 20% da mensalidade de R$ 97. No teto do limite chegaria a ~51%.

**Experimento** (3–5 perguntas seguidas, mesmo material de ~75 mil tokens):

| Configuração | Provedor | Cache | Custo/pergunta |
|---|---|---|---|
| sem configuração (antes) | variava | não | US$ 0,014–0,024 |
| `session_id` fixo | CoreWeave | 2 de 3, depois falhou | US$ 0,001–0,023 |
| `provider.order: ["deepseek"]` sem fallback | (bloqueado) | — | erro 404 |
| `provider.order: ["morph/fp8","deepinfra/fp8"]` | Morph | **5 de 5** | **US$ 0,0004** |

**Aprendizados:**
- O mesmo modelo é servido por quase 50 provedores, com preço de entrada de US$ 0,02 a 0,45 por milhão de tokens. **O provedor importava mais que o modelo.**
- O provedor oficial da DeepSeek é **bloqueado pela configuração de privacidade da conta OpenRouter** (ele pode treinar com os dados). O bloqueio foi mantido.
- O `session_id` fixo prende a sessão ao primeiro provedor que respondeu, e no teste ele ignorou a ordenação por preço.
- fp4 e mxfp4 ficaram de fora. fp8 tem perda mínima de qualidade, e as respostas nos testes vieram corretas e citando as aulas.

**Decisão:** `PROVEDORES = { order: ["morph/fp8", "deepinfra/fp8"], quantizations: ["fp8"] }` em `src/lib/api-auth.ts`, valendo para o assistente e o roteiro. A coluna `tokens_cache` foi adicionada em `ai_perguntas`.

**Resultado medido no app:** a 1ª pergunta (cache vazio) custou US$ 0,0018, e as seguintes US$ 0,0004. Isso dá ~R$ 0,60 por aluna/mês no cenário de 9/dia, ~1% da mensalidade. Com isso, **o RAG ficou desnecessário por enquanto**.

---

## 2026-11-04: Limite diário, histórico de perguntas e "perguntar sobre o trecho"

- **Tabela `ai_perguntas`:** texto, capítulo, tokens de entrada/saída e custo em US$ de cada pergunta. A RLS deixa a aluna ler só as próprias, e quem grava é o servidor.
- **Limite de 15 perguntas/dia** (`src/lib/limite.ts`), contado a partir da meia-noite de Brasília (UTC-3 fixo, sem horário de verão desde 2019). A rota responde 429 na 16ª. O aviso "Você ainda pode fazer N perguntas hoje" aparece a partir da 12ª, e aos 15 o campo trava.
- **Pergunta não respondida não conta:** se a OpenRouter falhar, a linha é apagada.
- **Custo lido do stream:** o `usage` (tokens e custo) chega no último evento SSE. `comRegistroDeUso` repassa o stream intacto à aluna e grava o custo ao final.
- **Seleção de texto no capítulo:** o botão "Perguntar à assistente" aparece sobre o trecho selecionado. O clique leva a `/app/assistente?capitulo=…&trecho=…`, e o trecho é enviado uma única vez como primeira pergunta.
- Limitação conhecida: contar e gravar não é atômico. Com duas abas ao mesmo tempo, dá para passar uma pergunta do limite.

---

## 2026-11-04: Assistente com IA sobre as aulas e o dossiê

**Pergunta da dona:** embeddings/RAG, fine-tuning ou o quê?

**Análise:**
- **Fine-tuning** foi descartado: ensina estilo e não fatos, continua inventando, é caro e precisaria ser refeito a cada atualização do material.
- **Tamanho do material:** transcrição ~40 mil palavras, dossiê ~5,7 mil, capítulos ~5 mil, total ~85–100 mil tokens. Cabe no contexto dos modelos atuais.
- **Decisão:** mandar o material inteiro a cada pergunta, o que é mais preciso porque o modelo vê tudo. O RAG fica reservado para se o material crescer muito ou o custo apertar.

**O que foi feito:**
- `/api/assistente` com streaming. O prompt (`src/lib/assistente.ts`) traz o resumo dos 12 capítulos (porte do assistente original), a transcrição, o dossiê, a persona de `ai_config` e a base `ai_knowledge`.
- **Regras do prompt:** responder só pelo material, dizer quando não sabe, citar "(Aula N, m:ss)" ou "Capítulo N", tratar o dossiê como conhecimento e não como instrução.
- O **dossiê também foi para o gerador de roteiros**, como referência de estilo, com o formato JSON tendo prioridade (lembrete no fim do prompt).
- A checagem comum das rotas de IA foi extraída para `src/lib/api-auth.ts` (`autorizar`, `chamarOpenRouter`).
- A tela original do assistente voltou: sugestões, "Nova conversa" e resposta aparecendo aos poucos. O cliente lê o SSE com `fetch` nativo (`src/lib/sse.ts`), sem dependência nova.
- **Teste no navegador:** uma pergunta de conteúdo das aulas foi respondida citando "(Aula 2, 1:01)", e uma pergunta fora do material ("imposto no Mercado Livre") foi recusada corretamente.
- **Um modelo só por enquanto** (`OPENROUTER_MODEL`) para assistente e roteiro. A ideia de modelos separados ficou para depois.

---

## 2026-11-04: Migração do Enter para Next.js + Supabase próprio

**Contexto:** o app nasceu como "Shop Club" no **Enter.pro** (construtor de apps por IA), com Vite + React. Usava o Supabase gerenciado pelo Enter, o gateway de IA do Enter (`api.enter.pro`), o SDK de analytics e o plugin de build do Enter. A dona quis o produto **inteiramente sob controle próprio**, sem resquícios do Enter, e com o nome **Shop Studio**. Ninguém usava o app de verdade (só testes), então o banco começou vazio.

Design e plano: `docs/superpowers/specs/2026-11-04-shop-studio-next-migration-design.md` e `docs/superpowers/plans/2026-11-04-shop-studio-next-migration.md`. A execução foi feita em 7 tarefas, cada uma revisada por um agente independente, mais uma revisão final da branch inteira.

**Decisões da dona:**
- Next.js com pnpm, numa pasta nova (`ShopStudioTTK`), mantendo o original intocado.
- Supabase próprio, desacoplado do Enter.
- Roteiros via OpenRouter.
- Visual intacto.
- Sem i18n.
- Sem a lógica de "primeira conta vira dona": a administração será uma página própria no futuro.
- Ícones provisórios "SS".

**Decisões técnicas tomadas na execução:**
- **Porte fiel:** as páginas viraram componentes cliente, e as trocas foram react-router → `next/link`/`next/navigation` e `location.state.from` → `?de=` (aceita só caminhos que começam com `/app`, o que evita redirecionamento para fora).
- **Sessão no navegador,** como no original. A rota de API valida o token com `supabase.auth.getUser(token)`.
- **Banco:** as 15 migrations do Enter viraram uma inicial, `20261104000000_init.sql`, sem `owner_id`, sem dados de teste e sem `ai_personas` (que o próprio Enter já tinha apagado). Tabelas de admin ficaram só para escrita da service role. O bucket virou `studio-videos`. A persona "Shop Girl" foi mantida, só com o nome trocado.
- **Modo revisão** (`ACESSO_ABERTO_PARA_REVISAO`) num módulo só, usado pela tela e pelo servidor. No original, a função de roteiro ignorava esse modo.
- **`max_tokens` de 1400 para 4000:** o modelo escolhido "pensa" antes de responder, e com 1400 o JSON vinha cortado. Medido: 1.701 tokens de saída, sendo 984 de raciocínio.
- **Ícones** gerados no build com `next/og` (Fraunces semibold, "ss" chocolate sobre `#F6E3E5`), sem dependência nova.
- **`lucide-react` fixado na versão do original:** a 1.x removeu o ícone do Instagram.
- **Recursos experimentais removidos:** `cacheComponents` e `partialPrefetching`, que o scaffold ativou e que mudam a renderização.

**Achados da revisão final e da conferência no navegador** (corrigidos):
- O favicon padrão do Next continuava no projeto.
- **Redefinir senha local:** o `site_url` estava em `127.0.0.1`, e o Next 16 em dev bloqueia essa origem, então o link caía numa página travada. A solução foi `site_url` em `localhost`, `allowedDevOrigins: ["127.0.0.1"]` e redirecionamento para `/redefinir` no evento `PASSWORD_RECOVERY`.
- **Rota de roteiro mais robusta:** limite de 500 caracteres por campo, erro claro quando a leitura do acesso falha, `console.error` nos erros e `maxDuration = 60`.
- O README estava desatualizado.
