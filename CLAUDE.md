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

- **Páginas** em `src/app/**`, quase todas componentes cliente (`"use client"`), portadas do original. A sessão do Supabase fica no navegador (`localStorage`), sem `@supabase/ssr` nem middleware. **O navegador não fala com o banco:** do Supabase ele só usa o login (`supabase.auth`); todo dado passa por `api()` (`src/lib/api-cliente.ts`) → rota em `src/app/api` → Postgres direto (`db()` em `src/lib/db.ts`, `DATABASE_URL`).
- **Login por e-mail + senha** (`src/app/entrar/page.tsx`, `signInWithPassword`). Sem login social, cadastro público nem "esqueci a senha". **A conta só nasce pelo webhook** `POST /api/webhook/conta` (segredo `WEBHOOK_CONTA_SEGREDO` no `Authorization: Bearer`; CORS só para `WEBHOOK_CONTA_ORIGENS`), que chama `criarConta` (`src/lib/contas.ts`): usuário confirmado pela API admin, senha temporária aleatória, linha em `senhas_temporarias` e `entitlement` (`origem = 'compra'`) numa consulta só; se o banco falhar, apaga o usuário. Por enquanto o webhook **devolve a senha temporária** na resposta; o envio por e-mail ainda não existe.
- **Senha temporária:** vale 30 min (`VALIDADE_SENHA_TEMPORARIA_MIN`; `estadoDaSenhaTemporaria` → `"pendente" | "expirada" | null`, pelo `now()` do banco). Enquanto houver linha em `senhas_temporarias`, `autenticar()` responde 403 e a guarda mostra `DefinirSenha` (`GET /api/acesso` devolve `trocarSenha` **só** enquanto houver linha; depois da troca o campo some). Webhook chamado de novo para conta com linha pendente gera outra senha e renova o prazo; sem linha, 409. `POST /api/senha` (só com a linha pendente) troca pela API admin e apaga a linha. **A troca derruba as sessões abertas**, então a tela entra de novo com a senha nova. A marca **não** vai no `app_metadata`/`user_metadata`: eles viajam no JWT e aparecem no navegador.
- O primeiro login cria o perfil em `ensureProfile` (`src/hooks/use-auth.tsx` → `POST /api/perfil`, que só grava se não existir).
- **Guarda da área logada:** `src/app/app/layout.tsx` (login → troca da senha temporária → acesso → `AppShell`). Sem sessão, o destino vem de `destinoSemSessao` (`src/lib/navegacao.ts`): se a pessoa clicou em "Sair" (`saiu` no `useAuth`), vai para `/entrar` limpo; se a sessão caiu sozinha, vai para `/entrar?de=<página>`. Não volte a montar o `?de=` direto na guarda.
- **Regra de acesso:** `src/lib/access.ts` (`ACESSO_ABERTO_PARA_REVISAO`, `temAcesso`). Roda só no servidor (`autenticar()`); a tela recebe o sim/não de `GET /api/acesso`.
- **Rotas de IA** (`src/app/api/{assistente,roteiro}/route.ts`) passam por `autorizar()` em `src/lib/api-auth.ts`, que checa nesta ordem: env OpenRouter → token Bearer → `entitlements`. A função devolve uma `Response` de erro ou `{ apiKey, model, user, userId }`. As outras rotas usam `autenticar()` (token + senha já trocada + acesso) ou, só `perfil`, `acesso` e `senha`, `logada()` (só token). O webhook não usa token de aluna, e sim o segredo. Chame a OpenRouter sempre por `chamarOpenRouter()`, que injeta `PROVEDORES`.
- **Assistente:** prompt em `src/lib/assistente.ts`. O `BASE_PROMPT` (regras + resumo dos capítulos + transcrição + dossiê) vem **primeiro e é idêntico para todas as alunas**, para aproveitar o cache de prompt. Persona, base de conhecimento e capítulo vêm depois. Não coloque nada variável antes do material. Com `OPENROUTER_PRESET`, o assistente chama `<modelo>@preset/<slug>` (o campo `preset` do corpo é ignorado), o system prompt do preset entra antes do nosso e a persona do `ai_config` sai. O roteiro nunca usa o preset (devolve JSON).
- **Limite diário:** `src/lib/limite.ts` (15 por dia, aviso a partir de 12, dia em Brasília UTC-3). A rota conta em `ai_perguntas`, grava a pergunta, apaga se a IA falhar e registra tokens/custo no fim do stream via `comRegistroDeUso` (`src/lib/uso.ts`).
- **Vídeos do roteiro:** `buscarVideos` (`src/lib/videos-tiktok.ts`, `BRAVE_API_KEY`) roda em paralelo dentro de `/api/roteiro` e nunca lança (falha = `videos: []`). São 3 buscas com goggle (só páginas de vídeo); `ordenarVideos` filtra por relevância e ordena por engajamento (curtidas e comentários dos `extra_snippets`). O resultado fica 3 dias em `videos_cache` e vale para termos parecidos (`normalizarTermo` + `extensions.similarity` ≥ 0,7); lista vazia não é gravada. Nada de scraping do TikTok (proibido nos termos); a Brave só acha as URLs, e o vídeo toca no player oficial. O roteiro salvo volta do navegador, então a tela só mostra URL que `parseVideoUrl` reconhece como TikTok.
- **Material da IA:** `src/lib/conhecimento/{transcricao,dossie}.md`, lidos do disco por `material.ts` (`server-only`). Eles entram no deploy pelo `outputFileTracingIncludes` no `next.config.ts`. Se criar outra rota que use o material, adicione-a lá.

## Convenções

- **Idioma:** textos de interface, mensagens de erro, comentários e commits em **português do Brasil**. Nomes de código podem misturar (`temAcesso`, `buildSystemPrompt`), então siga o padrão do arquivo.
- **Nome do produto:** sempre "Shop Studio". Nunca escreva "Shop Club", "shopclub", `club-videos`, nem nada do Enter (`enter.pro`, `@enter-pro`, `ENTER_`, `opentrust`).
- **Sem i18n:** os textos ficam direto no código.
- **Sem lógica de "dona/owner":** a administração será uma página própria no futuro. Tabelas de admin (`access_codes`, `ai_config`, `ai_knowledge`, `chapter_videos`) só são escritas pela service role.
- **Segredos:** `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` e `OPENROUTER_API_KEY` só em módulos com `import "server-only"`. Nunca importe `src/lib/supabase/admin.ts`, `roteiro.ts`, `assistente.ts` ou `conhecimento/material.ts` em componente cliente. Nunca leia, imprima ou commite o `.env.local`.
- **Testes** em `tests/`, espelhando `src/`, importando por `@/…`. Rotas são testadas com o banco falso de `tests/apoio/db-falso.ts` (mocks de `@/lib/db` e `@/lib/supabase/admin`), mais `@/lib/access`, `server-only`, `@/lib/conhecimento/material` e `global.fetch`. `tests/app/api/protecao.test.ts` acha **toda** rota sozinho e exige 401 sem token e 403 sem acesso; `isolamento.test.ts` confere o `user_id` de cada consulta. Testes nunca chamam a OpenRouter. Escreva o teste antes da mudança.
- **Visual:** idêntico ao original. Tokens em `src/app/globals.css`, Tailwind **v3** (`tailwind.config.ts`), fontes Fraunces (display) e Inter. Não introduza cores fixas. Sombras disponíveis: `shadow-soft`, `shadow-editorial`, `shadow-card`. A classe `shadow-elegant` aparece no código portado, mas **não existe**.
- **Migrations:** um arquivo novo por mudança (`AAAAMMDDHHMMSS_nome.sql`), com RLS ligado e **sem** políticas nem grants para `anon`/`authenticated` (ver Segurança). Depois rode `pnpm supabase migration up` e `pnpm db:types`. Nunca edite migrations já aplicadas.
- **Commits** pequenos, em português, terminando com a linha `Co-Authored-By` do agente.

## Segurança (não desfazer)

Auditoria de 2026-11-04: ver a seção Segurança do README e o DEVLOG.
- **Só o servidor cria conta:** `[auth] enable_signup = false` (o e-mail fica ligado só para o login). Ligado, qualquer pessoa cria conta com a anon key (achado 1 da auditoria). Testado em `tests/supabase/config.test.ts`.
- **Supabase blindado** (`config.toml`, testado em `tests/supabase/config.test.ts`): realtime desligado, `jwt_expiry = 900`, `secure_password_change = true`, `sign_in_sign_ups = 10`, e os e-mails de recovery/magic_link/email_change/reauthentication usam `supabase/templates/sem-link.html` (sem link nem código). Não ponha `{{ .ConfirmationURL }}` nem `{{ .Token }}` de volta sem o serviço de e-mail próprio.
- **Webhook de conta:** o segredo é a proteção de verdade; a lista de origens só controla o CORS (um `curl` escreve o `Origin` que quiser). Nunca aceite o webhook sem `WEBHOOK_CONTA_SEGREDO`.
- **Limites diários** contados no servidor por `reservarChamada` (`src/lib/api-auth.ts`), com `rota` separada. Nova rota de IA = nova `rota` + limite.
- **Nada de texto livre do navegador no prompt de sistema** (vide `capitulo` → `getChapter`).
- **CSP** em `src/lib/seguranca.ts`. Domínio externo novo precisa entrar ali (`frame-src`/`connect-src`), e o `connect-src` nunca leva `*`.
- **URLs vindas de alunas** (ex.: `success_cases.midia_url`) são validadas no banco (`https://`).
- **Conteúdo pago nunca vai no JavaScript público.** Capítulos (corpo), ganchos, desafio e checklist ficam em arquivos `server-only` de `src/content`, registrados em `src/content/protegido.ts`, e saem só por `/api/conteudo/<nome>`, que passa por `autenticar()` (token conferido no Supabase + `temAcesso`). No navegador: `useConteudo(nome)` + `<ConteudoCarregando>`. Em `chapters.ts`, `hooks.ts` e `challenge.ts` ficam só índice, rótulos e tipos. **Conteúdo novo:** arquivo com `import "server-only"`, entrada no registro e tipo em `ConteudoProtegido` (`types.ts`). Nunca importe esses arquivos numa tela; o build falha se isso acontecer.
- **Bucket `studio-videos` é privado:** arquivo só abre por URL assinada gerada no servidor (`/api/videos`, validade em `VIDEO_URL_VALIDADE_SEGUNDOS`).
- **Logada usa a plataforma, não o banco.** A Data API (PostgREST) fica **desligada** (`[api] enabled = false`; em produção, Project Settings → Data API), então ninguém vê tabela, coluna nem estrutura. No banco, `anon` e `authenticated` não têm privilégio nem política nenhuma (RLS ligado = nada), nem para objetos novos: não crie políticas nem grants para eles. A conexão do servidor é dona das tabelas e **não passa pelo RLS**, então o isolamento está no código: **toda consulta de dado de aluna filtra por `user_id = ${userId}`, com o `userId` do token, nunca do corpo**; compartilhado só o que as telas mostram (`success_cases` sem `user_id`, só `minha`; `chapter_videos`; `videos_cache`, só URLs públicas do TikTok). Rota nova = `autenticar()` + teste em `isolamento.test.ts`.

## Armadilhas conhecidas

- **`127.0.0.1` trava o app em dev:** o Next 16 bloqueia recursos de dev de outra origem e a página fica no loader. Use `localhost:3000`. O Supabase local também usa `localhost` como `site_url`.
- **Testar telas logadas:** crie a conta pelo webhook (`curl -X POST localhost:3000/api/webhook/conta -H "Authorization: Bearer $WEBHOOK_CONTA_SEGREDO" -d '{"email":"…"}'`) e entre com a senha devolvida. Se já houver um `next dev` rodando sem as variáveis do webhook, use `pnpm build && WEBHOOK_CONTA_SEGREDO=… pnpm start -p 3005`. **Apague os usuários de teste no fim.**
- **`overflow-x: clip`, não `hidden`, em `html`/`body`:** com `hidden`, o body vira contêiner de rolagem e o menu lateral `sticky` para de grudar. A altura cheia das telas usa `min-h-dvh`, porque não existe `#root` como no Vite.
- **Modelo com raciocínio:** o DeepSeek v4.1 Flash gasta tokens de saída "pensando". Por isso `max_tokens: 4000`, e não os 1400/700 do original, e a resposta com `finish_reason: "length"` vira erro claro.
- **Provedores:** `PROVEDORES` (`morph/fp8`, `deepinfra/fp8`, só fp8) vale **só para o modelo atual**. Trocar `OPENROUTER_MODEL` exige revisar essa lista; senão vem 404 "No endpoints found". O provedor oficial `deepseek` é bloqueado pela configuração de privacidade da conta (provedores que treinam com os dados). Não mude isso sem a dona do produto pedir.
- **`session_id` fixo prende o provedor:** testado e descartado. Ele grudou num provedor caro e o cache falhou. Use `provider.order`.
- **`useSearchParams`** exige `<Suspense>` em volta, senão o build falha.
- **`lucide-react` fixado em `^0.542.0`:** a 1.x removeu o ícone do Instagram usado em `challenge.tsx`.
- **`AGENTS.md`** é recriado pelo `next dev`. Commite-o, não apague.
- **`pnpm db:reset` apaga os dados locais.** Para migration nova, use `pnpm supabase migration up`.

## Estado atual e próximos passos

- A `main` (remoto `origin`) recebe tudo por PR: `fix/seguranca` (#1) e `feat/login-email-senha` (e-mail + senha, conta criada pelo webhook, senha temporária de 30 min, blindagem do Supabase).
- **Login:** falta decidir como a senha temporária chega à aluna (serviço de e-mail) e qual plataforma de venda vai chamar o webhook (o formato do segredo/assinatura pode mudar).
- **Bugs/ajustes conhecidos:**
  - no celular, o menu não fecha ao navegar;
  - a largura de 375 px não foi conferida no navegador.
- **Ideias em aberto:** página de admin; conjunto de ~20 perguntas de referência para avaliar a qualidade do assistente; RAG só se o material crescer muito.
