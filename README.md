# Shop Studio

Guia de TikTok Shop em formato de app para criadoras afiliadas no Brasil. São 12 capítulos interativos, um assistente de IA que responde com base nas aulas e no dossiê da especialista, um gerador de roteiros (método 5×5), checklist da primeira semana, desafio, mural de resultados e vídeos de campeões.

Stack: **Next.js 16** (App Router) · **React 19** · **Tailwind 3** + shadcn/Radix · **Supabase** (login, banco, storage) · **OpenRouter** (IA) · **Vitest** · **pnpm**.

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
9. [Login com Google](#login-com-google)
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
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, para o login (ver [Login com Google](#login-com-google)).

O `pnpm db:start` carrega o `.env.local` antes de subir o Supabase. Se você mudar as chaves do Google, rode `pnpm supabase stop` e depois `pnpm db:start`.

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
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | Supabase local (`supabase/config.toml`) | não |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | Supabase local (`supabase/config.toml`) | **sim** |

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
    entrar/                   login com Google
    app/                      área logada; layout.tsx = guarda de login + acesso + menu
      page.tsx                painel
      capitulos/[slug]/       leitor do capítulo ("Perguntar à assistente" ao selecionar texto)
      assistente/             chat com a IA
      roteiros/               gerador 5×5 + banco de ganchos
      checklist/  resultados/  campeoes/
    api/
      assistente/route.ts     chat com streaming, limite diário, registro de custo
      roteiro/route.ts        gerador de roteiros (JSON)
    icon.tsx  apple-icon.tsx  manifest.ts    identidade "ss" gerada no build
  components/                 telas e peças (ui/ = shadcn)
  content/                    texto dos capítulos, ganchos, checklist, desafio
  hooks/                      use-auth, use-access, use-ai-chat, use-perguntas-hoje…
  lib/
    access.ts                 modo revisão + regra de acesso (cliente e servidor)
    api-auth.ts               checagens das rotas de IA + chamada à OpenRouter (provedores fixos)
    assistente.ts             prompt do assistente
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

- **Login:** só com **Google**, pelo Supabase Auth com fluxo PKCE. Na primeira vez, o perfil é criado com o nome que vem do Google; quem já tem conta segue direto para o app. A sessão fica no navegador (`localStorage`), e as rotas de API recebem o token no header `Authorization: Bearer`.
- **Guarda da área logada** (`src/app/app/layout.tsx`): sem sessão, manda para `/entrar?de=<caminho>`. Com sessão e sem acesso, mostra a tela de desbloqueio por código.
- **Dados da aluna:** progresso, checklist, roteiros salvos e resultados passam pelas rotas do servidor (`src/app/api`), que conferem o token e filtram tudo pelo `user_id` dele. O navegador não fala com o banco: a Data API do Supabase fica desligada.
- **Seleção de texto no capítulo:** ao selecionar um trecho, aparece "Perguntar à assistente". O clique leva para `/app/assistente?capitulo=<slug>&trecho=<texto>`, e o trecho vira a primeira pergunta.

## IA: assistente, roteiros e custos

### Assistente (`/api/assistente`)
- Cada pergunta envia ao modelo as regras, o **resumo dos 12 capítulos**, a **transcrição das aulas** e o **dossiê da especialista** (~78 mil tokens). Junto vão a persona e a base de conhecimento do banco (`ai_config`, `ai_knowledge`) e as últimas 12 mensagens da conversa.
- A IA responde só com base no material, cita a aula e o minuto ("Aula 7, 3:12") e diz quando não sabe. A resposta chega aos poucos (SSE).
- **Limite de 15 perguntas por dia** por aluna, contadas a partir da meia-noite de Brasília. O aviso "Você ainda pode fazer N perguntas hoje" aparece a partir da 12ª. Pergunta que a IA não conseguiu responder não conta.

### Gerador de roteiros (`/api/roteiro`)
Usa o método 5×5 do capítulo 10, a persona e o dossiê (como referência de estilo). Devolve JSON com ganchos, problemas, soluções, CTAs, roteiro, hashtags e formato.

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
| `chapter_progress`, `checklist_progress` | progresso | a própria aluna |
| `saved_scripts` | roteiros salvos | a própria aluna |
| `success_cases` | mural de resultados | a própria aluna (todas leem) |
| `entitlements` | quem tem acesso liberado | função `resgatar_codigo` (via `POST /api/acesso`) |
| `access_codes` | códigos de compra | só service role (painel do Supabase) |
| `ai_config`, `ai_knowledge` | persona e fatos da IA | só service role |
| `chapter_videos` + bucket `studio-videos` | vídeos dos capítulos | só service role |
| `ai_perguntas` | perguntas ao assistente, tokens e custo | servidor (`/api/assistente`) |

Ainda não existe página de administração. Códigos, vídeos, persona e base de conhecimento são editados no painel do Supabase.

Para criar uma migration nova: crie `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, rode `pnpm supabase migration up` e depois `pnpm db:types`.

## Login com Google

**Cliente OAuth no Google Cloud** (APIs e serviços → Credenciais → ID do cliente OAuth, tipo **Aplicativo da Web**):

| Campo | Local | Produção |
|---|---|---|
| Origens JavaScript autorizadas | `http://localhost:3000` | `https://<domínio>` |
| URIs de redirecionamento autorizados | `http://127.0.0.1:54321/auth/v1/callback` | `https://<ref>.supabase.co/auth/v1/callback` |

O Google devolve a pessoa para o **Supabase**, e o Supabase devolve para o app (`/entrar`, que segue para `/app` ou para o `?de=`). Na tela de consentimento, use tipo **Externo**, escopos `openid`, `email` e `profile`, e, enquanto estiver em teste, cadastre os Gmails em **Usuários de teste**.

No Supabase local, o provedor fica em `[auth.external.google]` no `supabase/config.toml` (com `skip_nonce_check = true`, exigido localmente). O Client ID e o Secret vêm do `.env.local`.

O provedor de **e-mail está desligado** (`[auth.email] enabled = false`). Ligado, qualquer pessoa criava conta com a chave pública e passava por fora do Google. Veja [Segurança](#segurança).

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
| Criar conta sem o Google | Provedor de e-mail desligado no Supabase; só o Google cria conta. |
| Conta logada ver o banco (tabelas, estrutura, dados de outras) | Data API desligada; o navegador só fala com as rotas do app. `anon` e `authenticated` sem privilégio nenhum no banco. Toda consulta filtra pelo `user_id` do token; testado com duas contas e em `tests/app/api/{protecao,isolamento}.test.ts`. |
| Aluna liberar o próprio acesso, criar código ou mexer na IA | Essas tabelas não têm política de escrita: só a service role escreve. |
| Chutar códigos de acesso | `resgatar_codigo` (só o servidor executa) bloqueia depois de 10 erros por hora (tabela `access_code_tentativas`). |
| Gastar IA sem limite | 15 perguntas e 10 roteiros por dia por aluna, contados no servidor (`ai_perguntas.rota`). |
| Injetar instruções na IA | O navegador só manda o slug do capítulo; o título vem do conteúdo. O prompt proíbe copiar o material pago. |
| Roubo do token (a sessão fica no `localStorage`) | CSP com `connect-src` limitado ao app e ao Supabase: um script injetado não consegue mandar o token para fora. Sem `dangerouslySetInnerHTML`; respostas da IA são texto puro. |
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
3. Em **Auth → Providers → Google**, ative e cole o Client ID e o Secret. No Google Cloud, acrescente ao cliente OAuth a origem `https://<domínio>` e a URI `https://<ref>.supabase.co/auth/v1/callback`, e publique a tela de consentimento (em modo de teste, só os usuários de teste entram).
4. Na hospedagem (pensado para a Vercel), cadastre as 5 variáveis de ambiente.
5. Faça um teste rápido: entrar com Google, marcar um capítulo, gerar um roteiro e perguntar ao assistente.
6. **Antes de abrir ao público:** mude o modo revisão para `false` e coloque um **limite de crédito** na chave da OpenRouter.
7. **Segurança no painel do Supabase:** desligue **Auth → Providers → Email** (o `config.toml` só vale no local) e deixe o Google **sem** "Skip nonce check" (só o local precisa).

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| Página presa na tela "shop studio." com a barrinha | Foi aberta por `127.0.0.1`. Use `localhost:3000`. |
| "IA não configurada." | Falta `OPENROUTER_API_KEY` ou `OPENROUTER_MODEL`. Reinicie o `pnpm dev`. |
| Erro 404 "No endpoints found" da OpenRouter | O modelo mudou e os `PROVEDORES` não existem para ele. Revise `src/lib/api-auth.ts`. |
| Google mostra "redirect_uri_mismatch" | A URI no Google Cloud precisa ser exatamente `http://127.0.0.1:54321/auth/v1/callback` (local) ou `https://<ref>.supabase.co/auth/v1/callback` (produção). |
| Google diz "acesso bloqueado" / app não verificado | A tela de consentimento está em teste; adicione a conta em **Usuários de teste** ou publique o app. |
| Volta do Google e não entra | Confira se a Site URL e as Redirect URLs do Supabase incluem o endereço do app (`http://localhost:3000/**` no local). |
| `supabaseUrl is required` no build | Faltam as variáveis do Supabase no ambiente de build. |
| Assistente sem o material em produção | Os `.md` ficaram fora do deploy. Confira o `outputFileTracingIncludes` no `next.config.ts`. |
| Tipos do banco desatualizados | Rode `pnpm db:types`. |
