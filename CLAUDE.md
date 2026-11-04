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

Antes de dar uma tarefa por concluída: `pnpm test && pnpm lint && pnpm build`. O lint tem 1 aviso conhecido em `src/hooks/use-auth.tsx` (`window.location.assign` no `PASSWORD_RECOVERY`, que é intencional).

## Arquitetura (o essencial)

- **Páginas** em `src/app/**`, quase todas componentes cliente (`"use client"`), portadas do original. A sessão do Supabase fica no navegador (`localStorage`), sem `@supabase/ssr` nem middleware.
- **Guarda da área logada:** `src/app/app/layout.tsx` (login → acesso → `AppShell`).
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

## Armadilhas conhecidas

- **`127.0.0.1` trava o app em dev:** o Next 16 bloqueia recursos de dev de outra origem e a página fica no loader. Use `localhost:3000`. O Supabase local também usa `localhost` como `site_url`.
- **Modelo com raciocínio:** o DeepSeek v4.1 Flash gasta tokens de saída "pensando". Por isso `max_tokens: 4000`, e não os 1400/700 do original, e a resposta com `finish_reason: "length"` vira erro claro.
- **Provedores:** `PROVEDORES` (`morph/fp8`, `deepinfra/fp8`, só fp8) vale **só para o modelo atual**. Trocar `OPENROUTER_MODEL` exige revisar essa lista; senão vem 404 "No endpoints found". O provedor oficial `deepseek` é bloqueado pela configuração de privacidade da conta (provedores que treinam com os dados). Não mude isso sem a dona do produto pedir.
- **`session_id` fixo prende o provedor:** testado e descartado. Ele grudou num provedor caro e o cache falhou. Use `provider.order`.
- **`useSearchParams`** exige `<Suspense>` em volta, senão o build falha.
- **`lucide-react` fixado em `^0.542.0`:** a 1.x removeu o ícone do Instagram usado em `challenge.tsx`.
- **`AGENTS.md`** é recriado pelo `next dev`. Commite-o, não apague.
- **`pnpm db:reset` apaga os dados locais.** Para migration nova, use `pnpm supabase migration up`.

## Estado atual e próximos passos

- Branches locais: `feat/migracao-next` (migração) → `feat/assistente-ia` (assistente, limite, cache). Nada foi mergeado no `master` nem enviado a remoto.
- **Pendente, combinado com a dona:** login só com Google (sai e-mail/senha, link mágico e `/redefinir`; o primeiro acesso cria o perfil com o nome do Google e segue para o código ou para o modo revisão). A descrição ainda aguarda confirmação.
- **Bugs/ajustes conhecidos:**
  - no leitor de capítulo, o menu lateral rola junto com a página (o `sticky` não segura);
  - no celular, o menu não fecha ao navegar;
  - a largura de 375 px não foi conferida no navegador.
- **Ideias em aberto:** página de admin; conjunto de ~20 perguntas de referência para avaliar a qualidade do assistente; RAG só se o material crescer muito.
