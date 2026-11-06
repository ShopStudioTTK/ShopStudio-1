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
| `BRAVE_API_KEY` | só servidor (`src/lib/videos-tiktok.ts`). Vídeos do TikTok embaixo do roteiro. Vazia = o roteiro sai sem vídeos | **sim** |
| `OPENROUTER_MODEL` | só servidor. Hoje: `deepseek/deepseek-v4.1-flash-1017` | não |
| `OPENROUTER_PRESET` | só servidor, só o assistente. Slug do preset da OpenRouter com a voz da especialista (hoje: `ana-shop-studio-leads-behavior`). Com ele, a persona do `ai_config` sai do prompt do assistente. Vazio = sem preset | não |
| `WEBHOOK_CONTA_SEGREDO` | só servidor (`/api/webhook/conta`). A plataforma de venda manda no `Authorization: Bearer`. Sem ele, o webhook responde 500 | **sim** |
| `WEBHOOK_CONTA_ORIGENS` | só servidor. Origens liberadas no CORS do webhook, separadas por vírgula. Vazio = nenhuma | não |

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
      roteiros/               gerador 5×5 + banco de ganchos
      checklist/  resultados/  campeoes/
    api/
      assistente/route.ts     chat com streaming, limite diário, registro de custo
      roteiro/route.ts        gerador de roteiros (JSON)
      senha/route.ts          troca da senha temporária (primeiro acesso)
      webhook/conta/route.ts  cria a conta da aluna (chamado pela plataforma de venda)
    icon.tsx  apple-icon.tsx  manifest.ts    identidade "ss" gerada no build
  components/                 telas e peças (ui/ = shadcn)
  content/                    texto dos capítulos, ganchos, checklist, desafio
  hooks/                      use-auth, use-access, use-ai-chat, use-perguntas-hoje…
  lib/
    access.ts                 modo revisão + regra de acesso (cliente e servidor)
    api-auth.ts               checagens das rotas de IA + chamada à OpenRouter (provedores fixos)
    assistente.ts             prompt do assistente
    contas.ts                 criarConta: usuário + senha temporária + acesso (só servidor)
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
- A IA responde só com base no material, cita a aula e o minuto ("Aula 7, 3:12") e diz quando não sabe. A resposta chega aos poucos (SSE).
- **Voz da especialista:** com `OPENROUTER_PRESET`, o modelo vai como `<modelo>@preset/<slug>`, e o system prompt do preset (o jeito de falar da Ana) entra **antes** do nosso. Nesse caso, a persona do `ai_config` não vai, para as duas não brigarem. O preset leva **só o system prompt**: provedores, `temperature` e `max_tokens` ficam no código. O campo `preset` no corpo é ignorado pela OpenRouter (testado). Cada edição do preset zera o cache uma vez.
- **Limite de 15 perguntas por dia** por aluna, contadas a partir da meia-noite de Brasília. O aviso "Você ainda pode fazer N perguntas hoje" aparece a partir da 12ª. Pergunta que a IA não conseguiu responder não conta.

### Gerador de roteiros (`/api/roteiro`)
Usa o método 5×5 do capítulo 10, a persona e o dossiê (como referência de estilo). Devolve JSON com ganchos, problemas, soluções, CTAs, roteiro, hashtags e formato.

**Vídeos sobre o produto:** em paralelo com a IA, a rota faz 3 buscas na **Brave Search API** (`site:tiktok.com <produto>` com 3 grupos de termos em `OR`, Brasil, português, goggle que deixa só páginas de vídeo) e devolve até 6 vídeos em `videos` (`src/lib/videos-tiktok.ts`). Só entram vídeos que citam o produto, e os mais engajados (curtidas + 3 × comentários, lidos do texto que o TikTok publica na página) vêm primeiro: português primeiro e no máximo 2 em outra língua. A tela mostra com o player oficial do TikTok, avisa que é uma amostra (pode ter vídeo antigo ou em outro idioma) e tem o link "Ver os mais recentes no TikTok". Sem `BRAVE_API_KEY` ou com a Brave fora do ar, o roteiro sai sem vídeos. A busca conta no mesmo limite de 10 roteiros/dia (3 buscas da Brave por roteiro). Por que não scraping nem API do TikTok: ver o DEVLOG.

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

### Material da IA (`src/lib/conhecimento/`)
- `transcricao.md`: transcrição das aulas, uma seção `## Aula N - título` por aula, com as marcações `[m:ss – m:ss]` do vídeo.
- `dossie.md`: dossiê da especialista.

São texto puro e podem ser editados à mão. Mantenha o formato `## Aula…` e as marcações de tempo, porque o assistente usa as duas coisas para citar a fonte. Os arquivos são lidos só no servidor e nunca vão para o navegador. O `next.config.ts` os inclui no deploy das rotas de IA. Como eles foram gerados está no [`DEVLOG.md`](DEVLOG.md).

## Banco de dados

Migrations em `supabase/migrations/`:

| Tabela | Para quê | Quem escreve |
|---|---|---|
| `profiles` | nome e e-mail da aluna | a própria aluna |
| `senhas_temporarias` | contas que ainda não trocaram a senha temporária | servidor (webhook e `/api/senha`) |
| `chapter_progress`, `checklist_progress` | progresso | a própria aluna |
| `saved_scripts` | roteiros salvos | a própria aluna |
| `success_cases` | mural de resultados | a própria aluna (todas leem) |
| `entitlements` | quem tem acesso liberado | webhook da compra (`origem = 'compra'`) ou função `resgatar_codigo` (via `POST /api/acesso`) |
| `access_codes` | códigos de compra | só service role (painel do Supabase) |
| `ai_config`, `ai_knowledge` | persona e fatos da IA | só service role |
| `chapter_videos` + bucket `studio-videos` | vídeos dos capítulos | só service role |
| `ai_perguntas` | perguntas ao assistente, tokens e custo | servidor (`/api/assistente`) |

Ainda não existe página de administração. Códigos, vídeos, persona e base de conhecimento são editados no painel do Supabase.

Para criar uma migration nova: crie `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, rode `pnpm supabase migration up` e depois `pnpm db:types`.

## Login e criação de contas

**Fluxo:**
1. A plataforma de venda chama `POST /api/webhook/conta` com `{ "email": "…" }` e o cabeçalho `Authorization: Bearer <WEBHOOK_CONTA_SEGREDO>`.
2. O servidor (`criarConta`, em `src/lib/contas.ts`) cria o usuário já confirmado, com uma **senha temporária** aleatória (16 caracteres), marca a conta em `senhas_temporarias` e libera o acesso (`entitlements`).
3. A resposta é `201 { email, senhaTemporaria }`. **O envio da senha à aluna ainda não existe:** quando houver um serviço de e-mail, ele entra nessa rota.
4. A aluna entra em `/entrar` com o e-mail e a senha temporária, e o app pede a senha nova (mínimo de 6 caracteres). Até ela trocar, toda rota de conteúdo responde 403.
5. **A senha temporária vale 30 minutos** (`VALIDADE_SENHA_TEMPORARIA_MIN`, contados pelo relógio do banco). Depois disso, o app mostra "Sua senha temporária expirou" e não deixa trocar. Para gerar outra, chame o webhook de novo com o mesmo e-mail: ele cria uma senha nova, com mais 30 minutos, e a antiga para de valer.
6. A troca (`POST /api/senha`) apaga a linha da aluna em `senhas_temporarias` e derruba as sessões abertas. A tela entra de novo sozinha com a senha nova. Daí em diante, `GET /api/acesso` responde só `{ "acesso": true }`, sem campo de senha, e o JWT nunca carrega nada sobre isso.

Respostas do webhook: `201` conta criada (ou senha temporária renovada) · `400` e-mail inválido · `401` segredo ausente ou errado · `403` `Origin` fora da lista · `409` a aluna já definiu a própria senha · `500` segredo não configurado ou falha.

```bash
curl -X POST http://localhost:3000/api/webhook/conta \
  -H "Authorization: Bearer $WEBHOOK_CONTA_SEGREDO" -H "Content-Type: application/json" \
  -d '{"email":"aluna@exemplo.com"}'
```

**Segredo e CORS:** o segredo é o que impede outra pessoa de criar contas. A lista `WEBHOOK_CONTA_ORIGENS` só controla o CORS: um pedido com `Origin` fora dela leva 403, e só as origens da lista recebem `Access-Control-Allow-Origin`. Chamadas de servidor costumam não mandar `Origin`, e fora do navegador esse cabeçalho pode ser forjado, então ele não substitui o segredo.

**Supabase:** provedor de e-mail ligado e **cadastro público desligado** (`enable_signup = false`). Com o cadastro ligado, qualquer pessoa criava conta com a chave pública. A marca de senha temporária fica numa tabela que só o servidor lê, e não nos metadados do usuário, que viajam dentro do JWT e aparecem no navegador.

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
| Token roubado trocando a senha de outra pessoa | `POST /api/senha` só funciona com a senha temporária pendente. |
| Conta logada ver o banco (tabelas, estrutura, dados de outras) | Data API desligada; o navegador só fala com as rotas do app. `anon` e `authenticated` sem privilégio nenhum no banco. Toda consulta filtra pelo `user_id` do token; testado com duas contas e em `tests/app/api/{protecao,isolamento}.test.ts`. |
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
| "Sua senha temporária expirou" | Passaram 30 minutos. Chame o webhook de novo com o mesmo e-mail para gerar outra. |
| `supabaseUrl is required` no build | Faltam as variáveis do Supabase no ambiente de build. |
| Assistente sem o material em produção | Os `.md` ficaram fora do deploy. Confira o `outputFileTracingIncludes` no `next.config.ts`. |
| Tipos do banco desatualizados | Rode `pnpm db:types`. |
