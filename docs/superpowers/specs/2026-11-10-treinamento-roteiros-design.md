# Treinamento de roteiros: fichas da expert — design

**Data:** 2026-11-10 · **Status:** aprovado (ramo `feat/treinamento-roteiros`, em cima de `feat/minha-conta`)

## Por quê

O treinamento da IA (2026-11-09) só vale para o Pergunte pra IA. O gerador de roteiros, que é a oferta do produto, não aprende nada com a expert: segue só a regra genérica do método 5×5 (`METHOD` em `src/lib/roteiro.ts`) e o dossiê.

A dona quer que a expert (Ana) ensine **o jeito dela de pensar um roteiro**: para um produto X, qual gatilho ela usaria no gancho e **por quê**, com que **entonação** cada trecho é falado, em que formato, e como ela estrutura problema, solução e CTA. Não é a busca de uma resposta pronta, como no assistente: é o modelo de raciocínio e de expressão dela.

## Objetivos

1. Na página de treinamento, a expert registra **fichas de roteiro**, campo por campo.
2. O gerador usa as fichas parecidas como modelo, por trás. O roteiro da aluna **não explica** as escolhas: fica com a mesma cara de hoje.
3. Embaixo do roteiro, dois cartões mostram as fichas da Ana que têm a ver com o roteiro gerado.
4. A expert acrescenta gatilhos novos à lista pelo botão "+".

## Fora do escopo (por enquanto)

- Unificar os gatilhos com as categorias do banco de ganchos (`quebra | problema | curiosidade`, no ramo `feat/ganchos-comunidade`). As listas continuam separadas.
- Apagar ou renomear gatilhos (só acrescentar). Fichas mapeadas a partir do dossiê (a lista começa vazia).
- Usar as fichas no Pergunte pra IA, ou as respostas do treinamento no roteiro.
- O roteiro explicar as escolhas para a aluna (o porquê só aparece nos cartões, nas palavras da Ana).

## Seria um fracasso se…

- o roteiro da aluna passasse a "dar aula" ("usei fofoca porque…");
- o cartão 2 ensinasse uma entonação que não combina com o roteiro gerado (formato ou gatilho diferentes);
- texto que não foi escrito pela expert entrasse no prompt (regra "nada de texto livre do navegador no prompt de sistema"; as fichas são de admin, como as respostas do treinamento);
- a mudança derrubasse o cache de prompt do gerador (o dossiê é o prefixo cacheado).

## Como fica

### Ficha da expert (campo por campo)

| Campo | Observação |
|---|---|
| Produto | texto curto, obrigatório |
| Tipo de produto | texto curto, obrigatório (ex.: "skincare", "garrafa térmica") |
| Formato | um de `FORMATOS` (`src/content/formatos.ts`), a mesma lista da tela do gerador |
| Gancho | frase + **gatilho** (da tabela de gatilhos) + por quê + entonação |
| Problema | texto + por quê + entonação |
| Solução | texto + por quê + entonação |
| CTA | texto + por quê + entonação |

Os textos são obrigatórios. Porquê e entonação são obrigatórios no gancho e opcionais nas outras partes (decisão da dona: "em todas, por enquanto"; a tela mostra os campos em todas as partes).

**Embedding** (decisão da dona): calculado **só com o produto e o tipo** (`"<produto> — <tipo>"`), com o mesmo modelo e as mesmas 1536 dimensões do treinamento (`src/lib/embedding.ts`). O porquê e a entonação ficam fora, para uma ficha não parecer próxima de outra só por usar o mesmo gatilho. Editar o produto ou o tipo recalcula o embedding; o texto fica sempre guardado, então dá para reindexar tudo se o modelo mudar.

### Gatilhos

Tabela própria, que começa com: **curiosidade, fofoca, choque (quebra de padrão), problema, transformação, prova social**. Na ficha, ao lado da escolha do gatilho, um botão "+" cria um gatilho novo (só admin, `admin()` antes de ler o corpo), como as abas dos Campeões (`nichos`, `slugDe`). Nome repetido = 409.

### Página de treinamento (só admin)

Uma aba nova, **"Roteiros"**, ao lado da fila de perguntas: lista das fichas, "Nova ficha", editar e apagar (com confirmação). Tudo pelas rotas com `admin()`.

### Gerador de roteiros (`/api/roteiro`)

1. Gera o embedding do produto da aluna e busca as fichas mais parecidas. Se o embedding falhar, o roteiro sai como hoje, sem fichas.
2. Fichas com semelhança **≥ 0,7** entram no prompt de sistema como modelo de raciocínio (gatilho, porquê, entonação, estrutura), com a ordem de **não explicar** as escolhas no roteiro.
3. O JSON do roteiro ganha o campo **`gatilho`**: o gatilho do gancho escolhido, um dos slugs da tabela (a lista vai no prompt). Valor fora da lista vira vazio.
4. **Cache:** a lista de gatilhos e as fichas vão **depois** do dossiê (antes do `FORMATO_FINAL`), nunca antes. O prefixo `SYSTEM_PROMPT + DOSSIE_BLOCK` não muda.
5. A resposta da rota leva os dois cartões já prontos (abaixo). Limite diário, custo e reserva continuam iguais.

### Tela do roteiro (ordem decidida pela dona)

1. **Método 5×5**, como está hoje.
2. **Cartão 1 — "A Ana já fez roteiro de produtos parecidos".** Fichas com semelhança de produto **≥ 0,6**, as mais parecidas primeiro, no máximo 3. A primeira aberta (produto, gatilho, por quê, entonação e estrutura de cada parte); as outras numa linha com a % e "ver", que abre a ficha ali mesmo (opção A do esboço). Sem ficha ≥ 0,6, o cartão não aparece.
3. **Cartão 2 — "A Ana já fez alguns roteiros desse jeito, ela estruturou assim".** Fichas com o **mesmo formato** (o que a aluna escolheu) **e o mesmo gatilho** (o `gatilho` do JSON), de qualquer produto, as mais novas primeiro, no máximo 3, **sem repetir** as do cartão 1. Mesma aparência do cartão 1. Sem ficha, não aparece.

Roteiros salvos guardam o JSON como hoje; os cartões não precisam voltar ao abrir um salvo (escolha minha: eles dependem das fichas do momento).

## Segurança (não desfazer)

- Fichas e gatilhos só são escritos por rotas com `admin()`; `GET` das fichas para a tela de treinamento também é `admin()`. As fichas que saem no roteiro vão por `/api/roteiro` (`autorizar()`), só com os campos dos cartões (sem quem criou).
- Tabelas novas com RLS ligado, sem políticas nem grants para `anon`/`authenticated`. Sem `user_id` de aluna.
- Rotas novas entram no conjunto `ADMIN` do `protecao.test.ts`.
- Texto de aluna continua fora de qualquer prompt. O produto da aluna já vai no prompt de usuário hoje; agora também vira embedding (não vai para o prompt de sistema).

## O que fica para quem implementar

- Nomes de tabelas, colunas e rotas; limites de tamanho dos campos; layout exato da aba "Roteiros" e do formulário.
- Como a ficha entra no prompt (formato do bloco) e a redação da ordem "não explique as escolhas".
- Testes: rotas (admin, validação, 409 no gatilho repetido), busca e montagem dos dois cartões (limiares, deduplicação, formato + gatilho), prompt (fichas depois do dossiê, `gatilho` fora da lista vira vazio), e o embedding falhando sem derrubar o roteiro.
- Os limiares 0,6 / 0,7 são de partida e precisam de calibragem com uso real, como no assistente.
