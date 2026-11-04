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
9. [Acesso e códigos](#acesso-e-códigos)
10. [Testes](#testes)
11. [Produção](#produção)
12. [Problemas comuns](#problemas-comuns)

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

Preencha também `OPENROUTER_API_KEY` e `OPENROUTER_MODEL` no `.env.local`. Sem elas, o assistente e o gerador de roteiros não funcionam.

Os e-mails do Supabase local (confirmação, link mágico, redefinição de senha) não saem de verdade. Eles aparecem no **Mailpit**, no endereço que o `pnpm supabase status` mostra.

> Use **http://localhost:3000**. Pelo `127.0.0.1` o Next 16 em modo dev bloqueia scripts de outra origem e a página fica presa no carregamento. O `next.config.ts` libera `127.0.0.1`, mas `localhost` é o endereço configurado no Supabase.

## Variáveis de ambiente

| Variável | Onde é usada | Secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador e servidor | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador e servidor | não (as regras RLS protegem os dados) |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor (`src/lib/supabase/admin.ts`) | **sim** |
| `OPENROUTER_API_KEY` | só servidor (rotas `/api/*`) | **sim** |
| `OPENROUTER_MODEL` | só servidor. Hoje: `deepseek/deepseek-v4.1-flash-1017` | não |

Só as variáveis `NEXT_PUBLIC_*` chegam ao navegador. O `.env.local` está no `.gitignore` e nunca deve ser commitado.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | servidor de desenvolvimento |
| `pnpm build` / `pnpm start` | build de produção / servir o build |
| `pnpm test` | testes (Vitest, pasta `tests/`) |
| `pnpm lint` | ESLint |
| `pnpm db:start` | sobe o Supabase local |
| `pnpm db:reset` | recria o banco local a partir de `supabase/migrations` (apaga os dados locais) |
| `pnpm supabase migration up` | aplica só as migrations novas, mantendo os dados |
| `pnpm db:types` | regera `src/integrations/supabase/types.ts` a partir do banco local |

## Estrutura do projeto

```
src/
  app/                        rotas (App Router)
    page.tsx                  / → redireciona para /app ou /entrar
    entrar/  redefinir/       login, cadastro, link mágico, nova senha
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

- **Login:** e-mail e senha, link mágico e redefinição de senha, pelo Supabase Auth. A sessão fica no navegador (`localStorage`), e as rotas de API recebem o token no header `Authorization: Bearer`.
- **Guarda da área logada** (`src/app/app/layout.tsx`): sem sessão, manda para `/entrar?de=<caminho>`. Com sessão e sem acesso, mostra a tela de desbloqueio por código.
- **Dados da aluna:** progresso, checklist, roteiros salvos e resultados são gravados direto do navegador no Supabase. As regras RLS garantem que cada aluna só lê e escreve o que é dela.
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
| `entitlements` | quem tem acesso liberado | função `redeem_access_code` |
| `access_codes` | códigos de compra | só service role (painel do Supabase) |
| `ai_config`, `ai_knowledge` | persona e fatos da IA | só service role |
| `chapter_videos` + bucket `studio-videos` | vídeos dos capítulos | só service role |
| `ai_perguntas` | perguntas ao assistente, tokens e custo | servidor (`/api/assistente`) |

Ainda não existe página de administração. Códigos, vídeos, persona e base de conhecimento são editados no painel do Supabase.

Para criar uma migration nova: crie `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, rode `pnpm supabase migration up` e depois `pnpm db:types`.

## Acesso e códigos

- **Modo revisão:** `ACESSO_ABERTO_PARA_REVISAO` em `src/lib/access.ts`. Com `true`, que é o valor atual, qualquer conta entra sem código. Essa regra vale na tela e nas rotas de IA.
- **Código de acesso:** a aluna digita o código na tela de desbloqueio, e a função `redeem_access_code` cria o `entitlement`. Para criar códigos, no SQL editor:

```sql
insert into public.access_codes (code, limite_usos) values ('SHOPSTUDIO-XXXXXXXX', 1);
```

## Testes

Ficam em `tests/`, espelhando `src/` (por exemplo, `tests/lib/limite.test.ts` testa `src/lib/limite.ts`). Importe pelo alias `@/`. Os testes das rotas usam mocks do Supabase, do `fetch` e de `server-only`, e nunca chamam a OpenRouter.

```bash
pnpm test
```

## Produção

1. Crie o projeto no Supabase e rode `pnpm supabase link --project-ref <ref>` e `pnpm supabase db push`.
2. Em **Auth → URL Configuration**, defina a **Site URL** (o domínio de produção) e as **Redirect URLs** (`https://<domínio>/**`, que cobre `/redefinir`).
3. Configure um provedor de e-mail (SMTP) no Supabase. O envio padrão tem limite baixo e só manda para a equipe do projeto.
4. Na hospedagem (pensado para a Vercel), cadastre as 5 variáveis de ambiente.
5. Faça um teste rápido: criar conta, entrar, marcar um capítulo, gerar um roteiro e perguntar ao assistente.
6. **Antes de abrir ao público:** mude o modo revisão para `false` e coloque um **limite de crédito** na chave da OpenRouter.

## Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| Página presa na tela "shop studio." com a barrinha | Foi aberta por `127.0.0.1`. Use `localhost:3000`. |
| "IA não configurada." | Falta `OPENROUTER_API_KEY` ou `OPENROUTER_MODEL`. Reinicie o `pnpm dev`. |
| Erro 404 "No endpoints found" da OpenRouter | O modelo mudou e os `PROVEDORES` não existem para ele. Revise `src/lib/api-auth.ts`. |
| Link de redefinir senha cai na página errada | Confira a Site URL e as Redirect URLs no Auth do Supabase. |
| `supabaseUrl is required` no build | Faltam as variáveis do Supabase no ambiente de build. |
| Assistente sem o material em produção | Os `.md` ficaram fora do deploy. Confira o `outputFileTracingIncludes` no `next.config.ts`. |
| Tipos do banco desatualizados | Rode `pnpm db:types`. |
