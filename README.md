# Shop Studio

Guia de TikTok Shop em formato de app para criadoras afiliadas no Brasil. São 12 capítulos interativos, um assistente de IA que responde com base nas aulas e no dossiê da especialista, um gerador de roteiros (método 5×5), checklist da primeira semana, desafio, mural de resultados e vídeos de campeões.

Stack: **Next.js 16** (App Router) · **React 19** · **Tailwind 3** + shadcn/Radix · **Supabase** (login por e-mail + senha, banco, storage) · **OpenRouter** (IA) · **Vitest** · **pnpm**.

Histórico de decisões: [`DEVLOG.md`](DEVLOG.md). Instruções para agentes de IA que mexem no código: [`CLAUDE.md`](CLAUDE.md).

---

## Sumário

1. [Requisitos](#requisitos)
2. [Rodando localmente](#rodando-localmente)
3. [Variáveis de ambiente](#variáveis-de-ambiente)
4. [Scripts](#scripts)
5. [Estrutura do projeto](#estrutura-do-projeto)
6. [Como o app funciona](#como-o-app-funciona)
7. [IA: assistente, roteiros e custos](#ia-assistente-roteiros-e-custos)
   - [Treinamento da IA](#treinamento-da-ia-só-admin)
8. [Banco de dados](#banco-de-dados)
9. [Login e criação de contas](#login-e-criação-de-contas)
10. [Acesso e códigos](#acesso-e-códigos)
11. [Segurança](#segurança)
12. [Testes](#testes)
13. [Produção](#produção)
14. [Problemas comuns](#problemas-comuns)

---

## Requisitos

- **Node 20+** e **pnpm**
- **Docker** (para o Supabase local)

## Rodando localmente

```bash
pnpm install
cp .env.example .env.local

pnpm db:start          # sobe o Supabase no Docker (a primeira vez baixa as imagens)
pnpm supabase status   # copie API URL, anon key e service_role key para o .env.local
pnpm db:reset          # cria o banco a partir das migrations

pnpm dev               # http://localhost:3000
```

Preencha também no `.env.local`:
- `OPENROUTER_API_KEY` e `OPENROUTER_MODEL`, sem as quais o assistente e o gerador de roteiros não funcionam;
- `WEBHOOK_CONTA_SEGREDO` (e, se a plataforma chamar pelo navegador, `WEBHOOK_CONTA_ORIGENS`), para criar contas (ver [Login e criação de contas](#login-e-criação-de-contas)).

> Use **http://localhost:3000**. Pelo `127.0.0.1` o Next 16 em modo dev bloqueia scripts de outra origem e a página fica presa no carregamento. O `next.config.ts` libera `127.0.0.1`, mas `localhost` é o endereço configurado no Supabase.

## Variáveis de ambiente

| Variável | Onde é usada | Secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador e servidor | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador e servidor. Só serve para o login: com a Data API desligada, ela não abre o banco | não |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor (`src/lib/supabase/admin.ts`): login e storage | **sim** |
| `DATABASE_URL` | só servidor (`src/lib/db.ts`). Local: o `DB_URL` do `pnpm supabase status`. Produção: a connection string do **pooler em modo Transaction** (porta 6543), em Project Settings → Database | **sim** |
| `VIDEO_URL_VALIDADE_SEGUNDOS` | só servidor. Validade do link assinado dos vídeos do bucket (padrão 3600 = 1 h) | não |
| `OPENROUTER_API_KEY` | só servidor (rotas `/api/*`) | **sim** |
| `OPENROUTER_MODEL` | só servidor. Hoje: `deepseek/deepseek-v4.1-flash-1017` | não |
| `OPENROUTER_EMBEDDING_MODEL` | só servidor. Modelo de embedding do treinamento da IA. Padrão `openai/text-embedding-3-small` (1536 dimensões, acoplado à coluna `treinamento.embedding`) | não |
| `OPENROUTER_PRESET` | só servidor, só o assistente. Slug do preset da OpenRouter com a voz da especialista (hoje: `ana-shop-studio-leads-behavior`). Com ele, a persona do `ai_config` sai do prompt do assistente. Vazio = sem preset | não |
| `WEBHOOK_CONTA_SEGREDO` | só servidor (`/api/webhook/conta`). A plataforma de venda manda no `Authorization: Bearer`. Sem ele, o webhook responde 500 | **sim** |
| `WEBHOOK_CONTA_ORIGENS` | só servidor. Origens liberadas no CORS do webhook, separadas por vírgula. Vazio = nenhuma | não |
| `APPLYFY_WEBHOOK_TOKEN` | só servidor (`/api/webhook/applyfy`). Token do webhook na Applyfy, que ela manda no campo `token` do corpo. Sem ele, o webhook responde 500 | **sim** |
| `APPLYFY_PRODUTO_IDS` | só servidor. Ids dos produtos da Applyfy que liberam o app (`product.id` ou `externalId`), separados por vírgula. Vazio = o webhook recusa tudo | não |
| `RESEND_API_KEY` | só servidor (`src/lib/email.ts`). Envio do e-mail de acesso pela Resend | **sim** |
| `EMAIL_REMETENTE` | só servidor. Remetente do e-mail de acesso, num domínio verificado na Resend | não |
| `SITE_URL` | só servidor. Endereço público do app, sem barra no fim; o e-mail leva `SITE_URL/entrar` | não |

Só as variáveis `NEXT_PUBLIC_*` chegam ao navegador. O `.env.local` está no `.gitignore` e nunca deve ser commitado.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | build de produção / servir o build |
| `pnpm test` | testes (Vitest, pasta `tests/`) |
| `pnpm lint` | ESLint |
| `pnpm db:start` | carrega o `.env.local` e sobe o Supabase local |
| `pnpm db:reset` | recria o banco local a partir de `supabase/migrations` (apaga os dados locais) |
| `pnpm supabase migration up` | aplica só as migrations novas, mantendo os dados |
| `pnpm db:types` | regera `src/integrations/supabase/types.ts` a partir do banco local |

## Estrutura do projeto

```
src/
  app/                        rotas (App Router)
    page.tsx                  / → redireciona para /app ou /entrar
    entrar/                   login por e-mail + senha
    app/                      área logada; layout.tsx = guarda de login + acesso + menu
      page.tsx                painel
      capitulos/[slug]/       leitor do capítulo ("Perguntar à assistente" ao selecionar texto)
      assistente/             chat com a IA
      roteiros/               banco de ganchos (com notas e comunidade) + gerador 5×5
      checklist/  resultados/
      campeoes/               vídeos campeões por nicho (admin adiciona e remove ali mesmo)
      treinamento/            treinamento da IA (só admin): fila de perguntas e fichas de roteiro
      conta/                  minha conta: nome, e-mail e senha
    api/
      assistente/route.ts     chat com streaming, limite diário, registro de custo
      roteiro/route.ts        gerador de roteiros (JSON)
      treinamento/route.ts    fila de treinamento da IA (só admin, admin() em api-auth.ts)
      fichas/route.ts         fichas de roteiro da expert (só admin)
      gatilhos/route.ts       gatilhos do gancho das fichas; o "+" cria (só admin)
      senha/route.ts          troca da senha temporária (primeiro acesso)
      conta/route.ts          muda nome, e-mail e senha (e-mail e senha pedem a senha atual)
      webhook/conta/route.ts  cria a conta da aluna (chamado pela plataforma de venda)
      webhook/applyfy/route.ts compra paga na Applyfy → cria a conta e manda o e-mail de acesso
    icon.tsx  apple-icon.tsx  manifest.ts    identidade "ss" gerada no build
  components/                 telas e peças (ui/ = shadcn)
  content/                    texto dos capítulos, checklist, desafio (os ganchos ficam no banco)
  hooks/                      use-auth, use-access, use-ai-chat, use-perguntas-hoje…
  lib/
    access.ts                 modo revisão + regra de acesso (cliente e servidor)
    api-auth.ts               checagens das rotas de IA + chamada à OpenRouter (provedores fixos)
    assistente.ts             prompt do assistente
    embedding.ts              embedding pela OpenRouter (só servidor)
    treinamento.ts            limiares, busca das respostas da expert e fila das conversas (só servidor)
    contas.ts                 criarConta: usuário + senha temporária + acesso (só servidor)
    email.ts                  e-mail de acesso (link, e-mail e senha temporária) pela Resend
    roteiro.ts                prompt do gerador de roteiros
    limite.ts                 limite diário (15) e aviso (a partir de 12)
    uso.ts  sse.ts            leitura do stream e do custo da OpenRouter
    conhecimento/             material da IA: transcricao.md, dossie.md (só servidor)
    supabase/admin.ts         cliente service role (só servidor)
  integrations/supabase/      cliente do navegador + tipos gerados
tests/                        testes, espelhando a estrutura de src/
supabase/migrations/          esquema do banco
docs/superpowers/             design e plano da migração do Enter
```

## Como o app funciona

- **Login:** **e-mail + senha** pelo Supabase Auth. Ninguém se cadastra sozinha: a conta nasce pelo webhook da compra, com uma senha temporária. A sessão (um JWT do Supabase) fica no navegador (`localStorage`), e as rotas de API recebem o token no header `Authorization: Bearer`.
- **Guarda da área logada** (`src/app/app/layout.tsx`): sem sessão, manda para `/entrar?de=<caminho>`. Com a senha temporária ainda pendente, mostra "Defina a sua senha". Com sessão e sem acesso, mostra a tela de desbloqueio por código.
- **Dados da aluna:** progresso, checklist, roteiros salvos e resultados passam pelas rotas do servidor (`src/app/api`), que conferem o token e filtram tudo pelo `user_id` dele. O navegador não fala com o banco: a Data API do Supabase fica desligada.
- **Seleção de texto no capítulo:** ao selecionar um trecho, aparece "Perguntar à assistente". O clique leva para `/app/assistente?capitulo=<slug>&trecho=<texto>`, e o trecho vira a primeira pergunta.

## IA: assistente, roteiros e custos

### Assistente (`/api/assistente`)
- Cada pergunta envia ao modelo as regras, o **resumo dos 12 capítulos**, a **transcrição das aulas** e o **dossiê da especialista** (~78 mil tokens). Junto vão a persona e a base de conhecimento do banco (`ai_config`, `ai_knowledge`) e as últimas 12 mensagens da conversa.
- A IA usa primeiro o material e cita a aula e o minuto ("Aula 7, 3:12"). Quando o material não cobre o assunto, ela responde mesmo assim com o que se sabe em geral e diz que aquela parte não está nas aulas. Não abre com "o material não cobre", não atribui à Ana o que não é dela e não dá número, prazo ou regra inventados como certos. A resposta chega aos poucos (SSE).
- **Voz da especialista:** com `OPENROUTER_PRESET`, o modelo vai como `<modelo>@preset/<slug>`, e o system prompt do preset (o jeito de falar da Ana) entra **antes** do nosso. Nesse caso, a persona do `ai_config` não vai, para as duas não brigarem. O preset leva **só o system prompt**: provedores, `temperature` e `max_tokens` ficam no código. O campo `preset` no corpo é ignorado pela OpenRouter (testado). Cada edição do preset zera o cache uma vez.
- **Limite de 15 perguntas por dia** por aluna, contadas a partir da meia-noite de Brasília. O aviso "Você ainda pode fazer N perguntas hoje" aparece a partir da 12ª. Pergunta que a IA não conseguiu responder não conta.

### Ganchos (`/api/ganchos`)
A tela de Roteiros abre nos **ganchos** (a aba "Criar roteiro" vem depois, em `?aba=gerador`). São duas listas, com o mesmo filtro por tipo, busca e "Mais bem avaliados":
- **Banco do Studio:** os 60 ganchos de antes, agora na tabela `ganchos`.
- **Ganchos da comunidade:** pelo botão **"Registrar meu gancho"**, no topo da aba, abre a caixa: a aluna escreve o gancho, escolhe o tipo (quebra de padrão, problema ou curiosidade) e publica. Aparece para todas, sem o nome dela, os mais novos primeiro. Até 10 por dia por aluna (429 depois disso).

Toda aluna dá nota de 1 a 5 a qualquer gancho (`POST /api/ganchos/nota`; dar de novo troca a nota), e cada cartão mostra a média e quantas notas tem. Quem está em `admins` vê o lápis (muda o texto e o tipo) e a lixeira (pede confirmação) em todos os ganchos, do banco e da comunidade; `PATCH` e `DELETE` passam por `admin()`, e a aluna recebe 403. Apagar leva as notas junto.

### Gerador de roteiros (`/api/roteiro`)
Usa o método 5×5 do capítulo 10, a persona e o dossiê (como referência de estilo). Devolve JSON com ganchos, problemas, soluções, CTAs, roteiro, hashtags, formato e o **gatilho** do gancho escolhido (um dos slugs de `gatilhos`).

**Fichas da expert (treinamento de roteiros):** em `/app/treinamento`, aba **Roteiros**, "Nova ficha" abre o gerador, igual ao da aluna (produto, público, benefício e formato). A IA escreve o rascunho pela mesma `/api/roteiro`, com `rascunho: true`, já com o tipo do produto, o gatilho e o porquê e a entonação de cada parte. O formulário abre preenchido, e embaixo dele fica a prévia de **como a aluna vê** (roteiro pronto + 5×5). Cada mudança aparece na prévia; no 5×5 muda só a frase escolhida, e as outras 4 de cada coluna não são salvas. "Gerar outra versão" troca o rascunho, depois de confirmar. **"Escrever do zero"**, ao lado do "Nova ficha", abre o formulário vazio. Para quem está em `admins` (conferido no banco a cada chamada), a rota não tem limite diário (o custo continua em `ai_perguntas`) e aceita o `rascunho`; para a aluna, o campo é ignorado. A ficha registra como a expert pensaria o roteiro de um produto, campo por campo: produto, tipo, formato e, para gancho, problema, solução e CTA, o texto, o porquê e a entonação (porquê e entonação obrigatórios no gancho). O gatilho do gancho vem da tabela `gatilhos` (curiosidade, fofoca, choque, problema, transformação, prova social), e o "+" ao lado cria outro. O embedding da ficha é só de `"<produto> — <tipo>"`. No gerador:
- o produto da aluna vira embedding, e as fichas com semelhança **≥ 0,55** entram no prompt como modelo de raciocínio, **depois** do dossiê (o cache continua valendo), com a ordem de copiar a intenção dela (gatilho, porquê, entonação, estrutura) e não as frases (nenhuma abertura igual, nenhum trecho de 3 palavras seguidas igual), e de não explicar as escolhas no roteiro;
- embaixo do roteiro, o cartão **"A Ana já fez roteiro de produtos parecidos"** mostra até 3 fichas com semelhança **≥ 0,45**, e o cartão **"A Ana já fez alguns roteiros desse jeito"** mostra até 3 com o mesmo formato e o mesmo gatilho do roteiro gerado, sem repetir as do primeiro. Os dois cartões são dropdowns: vêm abertos e a aluna fecha pelo título;
- os cartões não vão para o roteiro salvo (o servidor descarta). Sem nenhuma ficha cadastrada, o gerador nem chama o embedding. Se o embedding ou o banco falharem, o roteiro sai igual, sem cartões.

Medido com `text-embedding-3-small` (2026-11-10): "sérum facial" × "Sérum facial Principia — skincare" = 0,73; "sérum de vitamina C" × a mesma ficha = 0,47; produtos sem relação ficam em 0,1–0,25. Com nomes curtos, 0,6 pegava só o mesmo produto; por isso os limiares (`src/lib/fichas.ts`) foram para 0,45 (cartão) e 0,55 (prompt).

**Vídeos campeões:** a tela tem uma aba por nicho, e as abas ficam na tabela `nichos` (começou com moda fitness, beleza, maternidade, casa e cozinha e moda feminina). Quem está em `admins` vê o botão **"Nova aba"** depois das abas: o nome vira o slug (`Casa & Cozinha` → `casa-cozinha`), e nome repetido dá 409. Uma aba vazia mostra "Apagar a aba"; aba com vídeo não é apagada (o banco também recusa). `GET /api/nichos` vale para todas as alunas; `POST` e `DELETE` passam por `admin()` antes de ler qualquer coisa do pedido. Os vídeos também são **escolhidos pela administração**: quem está em `admins` vê, na própria aba, um campo para colar o link do TikTok (com título opcional) e um botão "Remover" em cada vídeo. `GET /api/campeoes?nicho=<slug>` devolve os vídeos do nicho, os mais novos primeiro (até 60), iguais para todas as alunas; `POST` e `DELETE` passam por `admin()` e a aluna recebe 403. Só entra link completo de vídeo (`https://www.tiktok.com/@perfil/video/…`); a query (`?is_from_webapp=…`) é tirada, o link curto que o celular copia (`vt.tiktok.com/…` ou `vm.tiktok.com/…`, com ou sem `https://`) é trocado pelo link completo (o servidor lê só o redirecionamento do TikTok), e o mesmo vídeo não entra duas vezes no mesmo nicho. A galeria antiga (`chapter_videos`, coleção `campeao`) continua só no bloco da tela inicial.

### Custos e provedor
- O modelo **DeepSeek v4.1 Flash** é oferecido por dezenas de provedores, com preços muito diferentes. As chamadas vão fixas para o **Morph (fp8)**, com a **DeepInfra (fp8)** de reserva (`PROVEDORES` em `src/lib/api-auth.ts`).
- O material vem no início do prompt e é igual para todas as alunas. Isso aproveita o **cache de prompt**: medido ~**US$ 0,0004** por pergunta com cache e ~US$ 0,0018 com o cache vazio.
- A conta na OpenRouter bloqueia provedores que treinam modelos com os dados. Por isso o provedor oficial da DeepSeek não é usado.
- **Ao trocar `OPENROUTER_MODEL`, revise `PROVEDORES`.** Cada modelo tem outros provedores.
- Cada pergunta é gravada em `ai_perguntas`, com tokens, tokens em cache e custo em US$. Custo por aluna no mês:

```sql
select user_id, count(*) perguntas, sum(custo_usd) custo_usd, sum(tokens_cache) tokens_cache
from ai_perguntas
where created_at >= date_trunc('month', now())
group by user_id order by custo_usd desc;
```

### Treinamento da IA (só admin)

A expert responde perguntas do jeito dela em `/app/treinamento`, e o assistente usa essas respostas para falar com o mesmo tom, as mesmas frases e as mesmas gírias.

- **Fila:** são três origens de pergunta. As **mapeadas** são 25, gravadas pela migration a partir das aulas e do dossiê. As **de alunas** vêm das conversas do assistente: cada conversa é um item só, com as perguntas em ordem e o que a IA respondeu. As **criadas** saem do botão "Nova pergunta". Para cada pergunta, a expert pode responder, descartar ou editar. "Responder" abre o editor já com a resposta da IA dentro, e ela só muda o que quiser. A tela nunca mostra quem perguntou. Como a pergunta e a resposta salvas viram exemplo no prompt de outras alunas, numa pergunta de aluna o editor avisa para reescrever a pergunta de forma genérica e tirar o que for pessoal. Não há aprovação direta, sem passar pelo editor.
- **Assistente:** antes de chamar a IA, a pergunta da aluna (com as 2 anteriores da conversa) vira embedding, e o servidor busca as 4 respondidas mais parecidas. O resultado depende da semelhança:

  | Semelhança | O que acontece |
  |---|---|
  | **≥ 0,9** | a IA repete a resposta da expert quase palavra por palavra |
  | **≥ 0,7** | as respostas entram como modelo |
  | **≥ 0,6** | não vão para o prompt; só ligam as perguntas parecidas na tela de treinamento |

  O bloco da expert vai no **fim** do prompt, então o cache continua valendo. Os limiares ficam em `src/lib/treinamento.ts`. Se o embedding falhar, o assistente responde como antes.
- **Quem é admin:** a tabela `admins`, editada só no painel do Supabase. A guarda `admin()` confere a tabela no banco a cada chamada, e a aluna recebe 403.

```sql
insert into public.admins (user_id) select id from auth.users where email = 'expert@exemplo.com';
delete from public.admins where user_id = '…';
```

### Material da IA (`src/lib/conhecimento/`)
- `transcricao.md`: transcrição das aulas, uma seção `## Aula N - título` por aula, com as marcações `[m:ss – m:ss]` do vídeo.
- `dossie.md`: dossiê da especialista.

São texto puro e podem ser editados à mão. Mantenha o formato `## Aula…` e as marcações de tempo, porque o assistente usa as duas coisas para citar a fonte. Os arquivos são lidos só no servidor e nunca vão para o navegador. O `next.config.ts` os inclui no deploy das rotas de IA. Como eles foram gerados está no [`DEVLOG.md`](DEVLOG.md).

## Banco de dados

Migrations em `supabase/migrations/`:

| Tabela | Para quê | Quem escreve |
|---|---|---|
| `profiles` | nome e e-mail da aluna (espelho do login) | servidor (`/api/perfil` no primeiro login, `/api/conta`) |
| `compras_applyfy` | transações da Applyfy já processadas (o aviso repetido não gera outra senha) | servidor (`/api/webhook/applyfy`) |
| `senhas_temporarias` | contas que ainda não trocaram a senha temporária | servidor (webhook e `/api/senha`) |
| `chapter_progress`, `checklist_progress` | progresso | a própria aluna |
| `saved_scripts` | roteiros salvos | a própria aluna |
| `success_cases` | mural de resultados | a própria aluna (todas leem) |
| `entitlements` | quem tem acesso liberado | webhook da compra (`origem = 'compra'`) ou função `resgatar_codigo` (via `POST /api/acesso`) |
| `access_codes` | códigos de compra | só service role (painel do Supabase) |
| `ai_config`, `ai_knowledge` | persona e fatos da IA | só service role |
| `chapter_videos` + bucket `studio-videos` | vídeos dos capítulos | só service role |
| `nichos` | abas da tela de Campeões (compartilhado, sem `user_id`) | servidor (`/api/nichos`, só admin) |
| `campeoes` | vídeos campeões do TikTok por aba (compartilhado, sem `user_id`) | servidor (`/api/campeoes`, só admin) |
| `ganchos` | banco de ganchos e os da comunidade (`comunidade = true`). O `user_id` de quem registrou só serve ao limite diário e nunca sai nas rotas | servidor (`/api/ganchos`: aluna cria, admin edita e apaga) |
| `gancho_notas` | nota de 1 a 5 de cada aluna em cada gancho | servidor (`/api/ganchos/nota`) |
| `ai_perguntas` | perguntas ao assistente, tokens e custo | servidor (`/api/assistente`) |
| `admins` | quem acessa o treinamento da IA e cadastra as abas e os vídeos campeões | só service role (painel do Supabase) |
| `treinamento` | perguntas e respostas da expert, com embedding (pgvector, 1536). Sem `user_id` de aluna | servidor (`/api/treinamento`, só admin; `/api/assistente` grava as conversas) |
| `gatilhos` | gatilhos do gancho das fichas (slug + rótulo) | servidor (`/api/gatilhos`, só admin) |
| `fichas_roteiro` | fichas de roteiro da expert, com embedding (pgvector, 1536) só de produto + tipo. Sem `user_id` de aluna | servidor (`/api/fichas`, só admin) |
| `treinamento_conversas` | uma conversa do assistente = um item na fila. O `user_id` só serve para o servidor achar a conversa certa e nunca sai nas rotas | servidor (`/api/assistente`) |

No app, a administração tem a página de treinamento da IA, o cadastro na aba de Campeões e a edição dos ganchos. Admins, códigos, vídeos dos capítulos, persona e base de conhecimento continuam sendo editados no painel do Supabase.

Para criar uma migration nova: crie `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, rode `pnpm supabase migration up` e depois `pnpm db:types`.

## Login e criação de contas

**Fluxo:**
1. A plataforma de venda chama `POST /api/webhook/conta` com `{ "email": "…" }` e o cabeçalho `Authorization: Bearer <WEBHOOK_CONTA_SEGREDO>`.
2. O servidor (`criarConta`, em `src/lib/contas.ts`) cria o usuário já confirmado, com uma **senha temporária** aleatória (16 caracteres), marca a conta em `senhas_temporarias` e libera o acesso (`entitlements`).
3. A resposta é `201 { email, senhaTemporaria }`. **O envio da senha à aluna ainda não existe:** quando houver um serviço de e-mail, ele entra nessa rota.
4. A aluna entra em `/entrar` com o e-mail e a senha temporária, e o app pede a senha nova (mínimo de 6 caracteres). Até ela trocar, toda rota de conteúdo responde 403.
5. **A senha temporária vale 24 horas** (`VALIDADE_SENHA_TEMPORARIA_MIN`, contados pelo relógio do banco). Depois disso, o app mostra "Sua senha temporária expirou" e não deixa trocar. Para gerar outra, chame o webhook de novo com o mesmo e-mail: ele cria uma senha nova, com mais 24 horas, e a antiga para de valer.
6. Depois, a aluna muda nome, e-mail e senha em **Minha conta** (`/app/conta`, pelo cartão no rodapé do menu). E-mail e senha pedem a senha atual; o e-mail novo entra já confirmado.
7. A troca (`POST /api/senha`) apaga a linha da aluna em `senhas_temporarias` e derruba as sessões abertas. A tela entra de novo sozinha com a senha nova. Daí em diante, `GET /api/acesso` responde só `{ "acesso": true }`, sem campo de senha, e o JWT nunca carrega nada sobre isso.

Respostas do webhook: `201` conta criada (ou senha temporária renovada) · `400` e-mail inválido · `401` segredo ausente ou errado · `403` `Origin` fora da lista · `409` a aluna já definiu a própria senha · `500` segredo não configurado ou falha.

```bash
curl -X POST http://localhost:3000/api/webhook/conta \
  -H "Authorization: Bearer $WEBHOOK_CONTA_SEGREDO" -H "Content-Type: application/json" \
  -d '{"email":"aluna@exemplo.com"}'
```

**Segredo e CORS:** o segredo é o que impede outra pessoa de criar contas. A lista `WEBHOOK_CONTA_ORIGENS` só controla o CORS: um pedido com `Origin` fora dela leva 403, e só as origens da lista recebem `Access-Control-Allow-Origin`. Chamadas de servidor costumam não mandar `Origin`, e fora do navegador esse cabeçalho pode ser forjado, então ele não substitui o segredo.

**Supabase:** provedor de e-mail ligado e **cadastro público desligado** (`enable_signup = false`). Com o cadastro ligado, qualquer pessoa criava conta com a chave pública. A marca de senha temporária fica numa tabela que só o servidor lê, e não nos metadados do usuário, que viajam dentro do JWT e aparecem no navegador.

### Compra na Applyfy → e-mail de acesso

`POST /api/webhook/applyfy` é a URL cadastrada no webhook da Applyfy (evento de pagamento aprovado).

1. Confere o campo `token` do corpo com `APPLYFY_WEBHOOK_TOKEN` (tempo constante). Errado ou ausente: 401.
2. Só age em `TRANSACTION_PAID` de um produto de `APPLYFY_PRODUTO_IDS`. Outros eventos e produtos: 200 sem fazer nada. `TRANSACTION_CANCELED` na Applyfy é cartão recusado, não cancelamento.
3. Grava o `transaction.id` em `compras_applyfy`. Se já estava lá, é aviso repetido: 200 sem gerar outra senha (ela invalidaria a que a aluna recebeu).
4. Chama `criarConta` e manda o e-mail (`src/lib/email.ts`, Resend) com o link `SITE_URL/entrar`, o e-mail e a senha temporária, com um aviso em destaque de que ela vale 24 horas. Se a aluna já tinha definido a senha (`existe`), o e-mail só avisa que o acesso está liberado.
5. Se a conta ou o e-mail falharem, apaga a linha de `compras_applyfy` e responde 500, para a Applyfy reenviar (o reenvio gera uma senha nova e outro e-mail).

A senha temporária nunca volta na resposta nem vai para o log. Reembolso e chargeback ainda não tiram o acesso.

**Configurar:** na Resend, verificar o domínio do remetente e criar a chave. Na Applyfy, cadastrar o webhook com a URL `https://<app>/api/webhook/applyfy` e copiar o token para `APPLYFY_WEBHOOK_TOKEN`. O id do produto vai em `APPLYFY_PRODUTO_IDS`.

## Acesso e códigos

- **Modo revisão:** `ACESSO_ABERTO_PARA_REVISAO` em `src/lib/access.ts`. Com `true`, que é o valor atual, qualquer conta entra sem código. Essa regra vale na tela e nas rotas de IA.
- **Código de acesso:** a aluna digita o código na tela de desbloqueio, e o servidor (`POST /api/acesso`) chama a função `resgatar_codigo`, que cria o `entitlement`. Para criar códigos, no SQL editor:

```sql
insert into public.access_codes (code, limite_usos) values ('SHOPSTUDIO-XXXXXXXX', 1);
```

## Segurança

Auditoria feita em 2026-11-04 (detalhes e como cada falha foi reproduzida no [`DEVLOG.md`](DEVLOG.md)). Proteções em vigor:

| Risco | Proteção |
|---|---|
| Criar conta sem ter comprado | Cadastro público desligado (`enable_signup = false`). Só o webhook, com o segredo, cria conta. |
| Marca de senha temporária visível ou alterável pela aluna | Fica em `senhas_temporarias`, sem privilégio para `anon`/`authenticated`; nunca nos metadados do JWT. |
| Token roubado trocando a senha de outra pessoa | `POST /api/senha` só funciona com a senha temporária pendente. Em "Minha conta" (`PATCH /api/conta`), e-mail e senha só mudam com a senha atual, conferida no servidor. |
| Conta logada ver o banco (tabelas, estrutura, dados de outras) | Data API desligada; o navegador só fala com as rotas do app. `anon` e `authenticated` sem privilégio nenhum no banco. Toda consulta filtra pelo `user_id` do token; testado com duas contas e em `tests/app/api/{protecao,isolamento}.test.ts`. |
| Aluna ler ou mudar o treinamento da IA (vai no prompt de todas) | Toda rota de `/api/treinamento` passa por `admin()`, que confere `admins` no banco a cada chamada; a tela só esconde o menu. Testado em `protecao.test.ts` (aluna com acesso → 403). |
| Aluna escrever na conversa de outra na fila de treinamento | A conversa é sempre o par (`user_id` do token, id do navegador). A linha do treinamento não tem `user_id`, e a expert não vê quem perguntou. |
| Aluna liberar o próprio acesso, criar código ou mexer na IA | Essas tabelas não têm política de escrita: só a service role escreve. |
| Chutar códigos de acesso | `resgatar_codigo` (só o servidor executa) bloqueia depois de 10 erros por hora (tabela `access_code_tentativas`). |
| Gastar IA sem limite | 15 perguntas e 10 roteiros por dia por aluna, contados no servidor (`ai_perguntas.rota`). |
| Injetar instruções na IA | O navegador só manda o slug do capítulo; o título vem do conteúdo. O prompt proíbe copiar o material pago. |
| Roubo do token (a sessão fica no `localStorage`) | CSP com `connect-src` limitado ao app e ao Supabase: um script injetado não consegue mandar o token para fora. Sem `dangerouslySetInnerHTML`; respostas da IA são texto puro. O token vale 15 min. |
| E-mails de recuperação/link mágico disparados por qualquer um | Os modelos não têm link nem código (`supabase/templates/sem-link.html`). |
| Usar o Supabase direto com a chave pública | Data API e realtime desligados; storage sem política (listar volta vazio, enviar dá 403); admin dá 403; 10 logins a cada 5 min por IP. |
| Embutir o app em outro site (clickjacking) | `frame-ancestors 'none'` e `X-Frame-Options: DENY`. |
| Link malicioso nos casos de sucesso | O banco só aceita `https://` em `midia_url`. |
| Redirecionar para site falso após o login | `?de=` só aceita caminhos que começam com `/app`. |

Os cabeçalhos ficam em `src/lib/seguranca.ts`. **Ao embutir um player ou chamar um serviço externo novo, libere o domínio ali** (`frame-src` ou `connect-src`), senão o navegador bloqueia.

Pendências conhecidas (risco baixo):
- `script-src` usa `'unsafe-inline'`, porque o Next injeta scripts inline. Trocar por nonce exige proxy e renderização dinâmica.
- A contagem do limite diário não é atômica: duas abas ao mesmo tempo podem passar 1 do limite.

## Testes

Ficam em `tests/`, espelhando `src/` (por exemplo, `tests/lib/limite.test.ts` testa `src/lib/limite.ts`). Importe pelo alias `@/`. Os testes das rotas usam mocks do Supabase, do `fetch` e de `server-only`, e nunca chamam a OpenRouter.

```bash
pnpm test
```

## Produção

1. Crie o projeto no Supabase e rode `pnpm supabase link --project-ref <ref>` e `pnpm supabase db push`.
2. Em **Auth → URL Configuration**, defina a **Site URL** (o domínio de produção) e as **Redirect URLs** (`https://<domínio>/**`, que cobre `/entrar`).
3. Em **Auth → Sign In / Providers**, deixe o **Email** ligado e **desligue "Allow new users to sign up"**. Desligue também qualquer provedor social.
4. Na hospedagem (pensado para a Vercel), cadastre as variáveis de ambiente, inclusive `WEBHOOK_CONTA_SEGREDO` (gere com `openssl rand -base64 32`). Na plataforma de venda, configure o webhook para `https://<domínio>/api/webhook/conta` com esse segredo.
5. Faça um teste rápido: criar uma conta pelo webhook, entrar com a senha temporária, definir a senha, marcar um capítulo, gerar um roteiro e perguntar ao assistente.
6. **Antes de abrir ao público:** mude o modo revisão para `false` e coloque um **limite de crédito** na chave da OpenRouter.
7. **Segurança no painel do Supabase** (o `config.toml` só vale no local; repita tudo no painel):
   - **Data API desligada** (Project Settings → Data API) e **"Allow new users to sign up" desligado**.
   - **Realtime desligado:** o app não usa.
   - **Auth:** JWT expiry de 900 s; "Secure password change" ligado; Rate Limits com 10 logins a cada 5 min por IP.
   - **Email Templates:** em Reset Password, Magic Link, Change Email e Reauthentication, cole o conteúdo de `supabase/templates/sem-link.html`, que não tem link nem código. Qualquer pessoa consegue disparar esses e-mails com a chave pública.
   - **Banco:** em Database → Network Restrictions, libere só os IPs do servidor (ver [Banco: restrição por IP](#banco-restrição-por-ip)); ligue "Enforce SSL"; use uma senha longa e aleatória.
   - **Conta:** 2FA para todo mundo da organização, só as pessoas necessárias como membros, e rotação da `service_role` se ela vazar.
   - Rode o **Security Advisor** e resolva os avisos antes de abrir ao público.

### Banco: restrição por IP

O banco do Supabase é um Postgres que, por padrão, **aceita conexão de qualquer IP**. Hoje a única barreira é a `DATABASE_URL` (com a senha) não vazar. Ela não aparece no navegador nem no git, mas, se vazar, nada mais segura. A blindagem completa é o banco só aceitar conexões vindas do nosso servidor.

- **Supabase:** em **Database → Network Restrictions**, cadastre os IPs permitidos. A regra vale para a conexão direta e para o pooler (o caminho que o app usa), e não afeta o login nem o storage, que são HTTPS e continuam abertos ao navegador. Se a conexão direta for por IPv6, cadastre também os IPv6.
- **Vercel:** por padrão, as funções saem por IPs que mudam, e não há o que cadastrar. O recurso **Static IPs** (planos Pro e Enterprise) fixa a saída. Valores conferidos em 2026-11:
  - custa **US$ 100/mês por projeto**, mais a transferência de dados;
  - os IPs são **compartilhados** com outros clientes da Vercel, então a senha forte continua necessária;
  - não vale para o Middleware, que o app não usa.
  - Os IPs aparecem em Settings → Networking do projeto.

| Opção | Proteção | Custo |
|---|---|---|
| Vercel Pro + Static IPs + Network Restrictions (**recomendado para clientes pagantes**) | IP + senha | ~US$ 100/mês + plano Pro |
| Servidor próprio com IP fixo exclusivo (VPS) | IP exclusivo + senha | em geral menor, mas exige cuidar do servidor |
| Sem restrição de IP | só a senha | zero |

Sem restrição de IP, no mínimo:
- use uma senha longa e aleatória;
- ligue **Enforce SSL**;
- guarde a `DATABASE_URL` só nas variáveis da hospedagem (marcada como *sensitive* na Vercel);
- nunca cole essa URL em chat, print ou issue.

Referências:
- [Vercel Static IPs](https://vercel.com/docs/connectivity/static-ips)
- [Supabase: restrições no pooler](https://supabase.com/changelog/20522-supavisor-starts-enforcing-network-restrictions)

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| Página presa na tela "shop studio." com a barrinha | Foi aberta por `127.0.0.1`. Use `localhost:3000`. |
| "IA não configurada." | Falta `OPENROUTER_API_KEY` ou `OPENROUTER_MODEL`. Reinicie o `pnpm dev`. |
| Erro 404 "No endpoints found" da OpenRouter | O modelo mudou e os `PROVEDORES` não existem para ele. Revise `src/lib/api-auth.ts`. |
| Webhook responde 500 "Webhook não configurado." | Falta `WEBHOOK_CONTA_SEGREDO`. Reinicie o servidor depois de configurar. |
| Webhook responde 403 "Origem não permitida." | O pedido manda um `Origin` que não está em `WEBHOOK_CONTA_ORIGENS`. |
| "E-mail ou senha incorretos." com a senha temporária | Ela já foi trocada, foi substituída por outra (webhook chamado de novo) ou a conta não existe. |
| "Sua senha temporária expirou" | Passaram 24 horas. Chame o webhook de novo com o mesmo e-mail para gerar outra. |
| `supabaseUrl is required` no build | Faltam as variáveis do Supabase no ambiente de build. |
| Assistente sem o material em produção | Os `.md` ficaram fora do deploy. Confira o `outputFileTracingIncludes` no `next.config.ts`. |
| Tipos do banco desatualizados | Rode `pnpm db:types`. |
