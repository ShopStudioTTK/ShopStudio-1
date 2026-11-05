# CLAUDE.md

Guia para agentes trabalhando neste repositório. Para setup e operação, veja o [`README.md`](README.md). Para o histórico de decisões e o porquê de cada uma, veja o [`DEVLOG.md`](DEVLOG.md).

@AGENTS.md

## O projeto

Shop Studio: guia de TikTok Shop em formato de app para criadoras afiliadas no Brasil, com capítulos, assistente de IA, gerador de roteiros, checklist e resultados. É uma migração do "Shop Club" (feito no Enter.pro, Vite) para Next.js 16 + Supabase próprio + OpenRouter. A pasta irmã `../ShopStudio` é o original e é **somente leitura**: serve de referência, nunca escreva lá.

## Comandos

```bash
pnpm dev                     # http://localhost:3000  (NÃO use 127.0.0.1, ver Armadilhas)
pnpm test                    # vitest, só tests/**/*.test.ts
pnpm lint
pnpm build
pnpm db:start                # Supabase local (Docker)
pnpm supabase migration up   # aplica migrations novas SEM apagar dados
pnpm db:reset                # recria o banco do zero (APAGA dados locais)
pnpm db:types                # regera src/integrations/supabase/types.ts
```

Antes de dar uma tarefa por concluída: `pnpm test && pnpm lint && pnpm build` (todos limpos, sem avisos).

## Arquitetura (o essencial)

- **Páginas** em `src/app/**`, quase todas componentes cliente (`"use client"`), portadas do original. A sessão do Supabase fica no navegador (`localStorage`), sem `@supabase/ssr` nem middleware.
- **Login só com Google** (`src/app/entrar/page.tsx`, `signInWithOAuth`, cliente com `flowType: "pkce"`). O retorno volta para `/entrar?de=…`, e a página segue para o app quando a sessão aparece. O primeiro login cria o perfil em `ensureProfile` (`src/hooks/use-auth.tsx`, `ignoreDuplicates`), com o nome vindo de `nomeDoPerfil` (`src/lib/nome.ts`: `full_name` → `name` → `nome`). Não há mais e-mail/senha, link mágico nem `/redefinir` na interface.
- **Guarda da área logada:** `src/app/app/layout.tsx` (login → acesso → `AppShell`). Sem sessão, o destino vem de `destinoSemSessao` (`src/lib/navegacao.ts`): se a pessoa clicou em "Sair" (`saiu` no `useAuth`), vai para `/entrar` limpo; se a sessão caiu sozinha, vai para `/entrar?de=<página>`. Não volte a montar o `?de=` direto na guarda.
- **Regra de acesso:** `src/lib/access.ts` (`ACESSO_ABERTO_PARA_REVISAO`, `temAcesso`). É usada na tela **e** nas rotas de API. Mantenha as duas em sincronia por esse módulo.
- **Rotas de IA** (`src/app/api/{assistente,roteiro}/route.ts`) passam por `autorizar()` em `src/lib/api-auth.ts`, que checa nesta ordem: env OpenRouter → token Bearer → `entitlements`. A função devolve uma `Response` de erro ou `{ apiKey, model, supabase, userId }`. Chame a OpenRouter sempre por `chamarOpenRouter()`, que injeta `PROVEDORES`.
- **Assistente:** prompt em `src/lib/assistente.ts`. O `BASE_PROMPT` (regras + resumo dos capítulos + transcrição + dossiê) vem **primeiro e é idêntico para todas as alunas**, para aproveitar o cache de prompt. Persona, base de conhecimento e capítulo vêm depois. Não coloque nada variável antes do material.
- **Limite diário:** `src/lib/limite.ts` (15 por dia, aviso a partir de 12, dia em Brasília UTC-3). A rota conta em `ai_perguntas`, grava a pergunta, apaga se a IA falhar e registra tokens/custo no fim do stream via `comRegistroDeUso` (`src/lib/uso.ts`).
- **Material da IA:** `src/lib/conhecimento/{transcricao,dossie}.md`, lidos do disco por `material.ts` (`server-only`). Eles entram no deploy pelo `outputFileTracingIncludes` no `next.config.ts`. Se criar outra rota que use o material, adicione-a lá.

## Convenções

- **Idioma:** textos de interface, mensagens de erro, comentários e commits em **português do Brasil**. Nomes de código podem misturar (`temAcesso`, `buildSystemPrompt`), então siga o padrão do arquivo.
- **Nome do produto:** sempre "Shop Studio". Nunca escreva "Shop Club", "shopclub", `club-videos`, nem nada do Enter (`enter.pro`, `@enter-pro`, `ENTER_`, `opentrust`).
- **Sem i18n:** os textos ficam direto no código.
- **Sem lógica de "dona/owner":** a administração será uma página própria no futuro. Tabelas de admin (`access_codes`, `ai_config`, `ai_knowledge`, `chapter_videos`) só são escritas pela service role.
- **Segredos:** `SUPABASE_SERVICE_ROLE_KEY` e `OPENROUTER_API_KEY` só em módulos com `import "server-only"`. Nunca importe `src/lib/supabase/admin.ts`, `roteiro.ts`, `assistente.ts` ou `conhecimento/material.ts` em componente cliente. Nunca leia, imprima ou commite o `.env.local`.
- **Testes** em `tests/`, espelhando `src/`, importando por `@/…`. Rotas são testadas com mocks de `@/lib/supabase/admin`, `@/lib/access`, `server-only`, `@/lib/conhecimento/material` e `global.fetch`. Testes nunca chamam a OpenRouter. Escreva o teste antes da mudança.
- **Visual:** idêntico ao original. Tokens em `src/app/globals.css`, Tailwind **v3** (`tailwind.config.ts`), fontes Fraunces (display) e Inter. Não introduza cores fixas. Sombras disponíveis: `shadow-soft`, `shadow-editorial`, `shadow-card`. A classe `shadow-elegant` aparece no código portado, mas **não existe**.
- **Migrations:** um arquivo novo por mudança (`AAAAMMDDHHMMSS_nome.sql`), com RLS ligado e políticas explícitas. Depois rode `pnpm supabase migration up` e `pnpm db:types`. Nunca edite migrations já aplicadas.
- **Commits** pequenos, em português, terminando com a linha `Co-Authored-By` do agente.

## Segurança (não desfazer)

Auditoria de 2026-11-04: ver a seção Segurança do README e o DEVLOG.
- **Só Google cria conta:** `[auth.email] enabled = false`.
- **Escrita no banco:** tabelas de admin e `ai_perguntas`/`access_code_tentativas` não têm política de escrita para `authenticated`. Nova tabela = RLS ligado + políticas explícitas, testadas com duas contas.
- **Limites diários** contados no servidor por `reservarChamada` (`src/lib/api-auth.ts`), com `rota` separada. Nova rota de IA = nova `rota` + limite.
- **Nada de texto livre do navegador no prompt de sistema** (vide `capitulo` → `getChapter`).
- **CSP** em `src/lib/seguranca.ts`. Domínio externo novo precisa entrar ali (`frame-src`/`connect-src`), e o `connect-src` nunca leva `*`.
- **URLs vindas de alunas** (ex.: `success_cases.midia_url`) são validadas no banco (`https://`).
- **Conteúdo pago nunca vai no JavaScript público.** Capítulos (corpo), ganchos, desafio e checklist ficam em arquivos `server-only` de `src/content`, registrados em `src/content/protegido.ts`, e saem só por `/api/conteudo/<nome>`, que passa por `autenticar()` (token conferido no Supabase + `temAcesso`). No navegador: `useConteudo(nome)` + `<ConteudoCarregando>`. Em `chapters.ts`, `hooks.ts` e `challenge.ts` ficam só índice, rótulos e tipos. **Conteúdo novo:** arquivo com `import "server-only"`, entrada no registro e tipo em `ConteudoProtegido` (`types.ts`). Nunca importe esses arquivos numa tela; o build falha se isso acontecer.
- **Bucket `studio-videos` é privado:** arquivo só abre por URL assinada (`createSignedUrls` em `use-videos.ts`, validade em `NEXT_PUBLIC_VIDEO_URL_VALIDADE_SEGUNDOS`), e só `authenticated` consegue assinar.
- **Logada usa a plataforma, não o banco:** cada conta só lê/escreve as próprias linhas (`auth.uid() = user_id`); compartilhado só o que as telas mostram (`success_cases`, `chapter_videos`). `ai_config`/`ai_knowledge` não têm política de leitura: só a service role lê. O `anon` não tem privilégio nenhum em `public` (nem por padrão para objetos novos), e função nova não é executável por padrão: dê `grant execute ... to authenticated` quando uma tela ou política precisar. Mudou política? Repita o teste das duas contas (conta A tentando ler/alterar/criar dados da conta B).

## Armadilhas conhecidas

- **`127.0.0.1` trava o app em dev:** o Next 16 bloqueia recursos de dev de outra origem e a página fica no loader. Use `localhost:3000`. O Supabase local também usa `localhost` como `site_url`. A exceção é o callback do Google, que é `http://127.0.0.1:54321/auth/v1/callback`, a URL do próprio Supabase local, cadastrada assim no Google Cloud.
- **Chaves do Google no Supabase local:** o `config.toml` lê `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_*)`. O script `pnpm db:start` carrega o `.env.local` antes de subir. Rodar `supabase start` direto deixa o Google sem chaves.
- **Testar o Google ponta a ponta exige um humano:** um agente não entra em contas Google. Para testar telas logadas, o provedor de e-mail precisa estar ligado só durante o teste: mude `[auth.email] enabled` para `true` no `config.toml`, rode `pnpm supabase stop && pnpm db:start`, crie o usuário pela API admin, faça o login por senha e injete a sessão no `localStorage` (`sb-127-auth-token`). **Depois volte para `false`, reinicie e apague os usuários de teste. Nunca commite o e-mail ligado:** isso reabre a criação de contas por fora do Google.
- **`overflow-x: clip`, não `hidden`, em `html`/`body`:** com `hidden`, o body vira contêiner de rolagem e o menu lateral `sticky` para de grudar. A altura cheia das telas usa `min-h-dvh`, porque não existe `#root` como no Vite.
- **Modelo com raciocínio:** o DeepSeek v4.1 Flash gasta tokens de saída "pensando". Por isso `max_tokens: 4000`, e não os 1400/700 do original, e a resposta com `finish_reason: "length"` vira erro claro.
- **Provedores:** `PROVEDORES` (`morph/fp8`, `deepinfra/fp8`, só fp8) vale **só para o modelo atual**. Trocar `OPENROUTER_MODEL` exige revisar essa lista; senão vem 404 "No endpoints found". O provedor oficial `deepseek` é bloqueado pela configuração de privacidade da conta (provedores que treinam com os dados). Não mude isso sem a dona do produto pedir.
- **`session_id` fixo prende o provedor:** testado e descartado. Ele grudou num provedor caro e o cache falhou. Use `provider.order`.
- **`useSearchParams`** exige `<Suspense>` em volta, senão o build falha.
- **`lucide-react` fixado em `^0.542.0`:** a 1.x removeu o ícone do Instagram usado em `challenge.tsx`.
- **`AGENTS.md`** é recriado pelo `next dev`. Commite-o, não apague.
- **`pnpm db:reset` apaga os dados locais.** Para migration nova, use `pnpm supabase migration up`.

## Estado atual e próximos passos

- Branches locais: `feat/migracao-next` (migração) → `feat/assistente-ia` (assistente, limite, cache). Nada foi mergeado no `master` nem enviado a remoto.
- **Login com Google:** implementado. O fluxo completo com uma conta Google real ainda precisa ser testado pela dona (ver Armadilhas).
- **Bugs/ajustes conhecidos:**
  - no celular, o menu não fecha ao navegar;
  - a largura de 375 px não foi conferida no navegador.
- **Ideias em aberto:** página de admin; conjunto de ~20 perguntas de referência para avaliar a qualidade do assistente; RAG só se o material crescer muito.
