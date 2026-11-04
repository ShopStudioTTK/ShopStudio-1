# Shop Studio: migração para Next.js + Supabase próprio. Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** reconstruir o app Shop Club (Vite/Enter) como **Shop Studio** em Next.js, dentro de `ShopStudioTTK/`, com Supabase próprio, roteiros via OpenRouter e nenhum resquício do Enter.

**Arquitetura:** porte fiel das telas atuais como componentes cliente no App Router do Next. A sessão do Supabase continua no navegador, igual hoje. Uma única rota de servidor (`POST /api/roteiro`) valida o token, checa o acesso, lê a configuração da IA com a service role e chama a OpenRouter. O banco nasce de uma migração única consolidada.

**Stack:** Next.js (App Router, TypeScript), pnpm, Tailwind **v3** (mesmo `tailwind.config.ts` do original), shadcn/Radix, `@supabase/supabase-js`, `@tanstack/react-query`, `sonner`, `lucide-react`, Vitest, Supabase CLI (devDependency `supabase`), Docker já instalado na máquina para o Supabase local.

**Spec:** `docs/superpowers/specs/2026-11-04-shop-studio-next-migration-design.md`. Leia junto com este plano.

**Origem (somente leitura):** `/home/lucasjoaoo/prog/ShopStudio`, chamado de `ORIG/` abaixo. Nunca escreva nada lá.

## Restrições globais

- Gerenciador: **pnpm**. Nome do pacote: `shop-studio`.
- Nome visível: **"Shop Studio"**. Wordmark: `shop studio.` (uma linha) e `shop` / `studio.` (empilhado). Prefixo de código: `SHOPSTUDIO-`. Bucket: `studio-videos`.
- Visual idêntico ao original: tokens de `ORIG/src/index.css`, `ORIG/tailwind.config.ts` (Tailwind v3, `tailwindcss-animate`) e fontes Fraunces (display) e Inter (sans).
- Textos em português direto no código. Nada de i18n (`i18next`, `react-i18next`, `public/locales`, `i18n.config.json`, `language-switcher`).
- Proibido no repositório (fora de `node_modules`): `enter.pro`, `opentrust`, `@enter-pro`, `enter-dev`, `ENTER_`, `EnterCloud`, `Shop Club`, `shopclub`, `SHOPCLUB`, `club-videos`, `.enter/`.
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`. Só as duas `NEXT_PUBLIC_*` podem chegar ao navegador.
- Sem lógica de dona: nada de `owner_id`, `isOwner`, `isUnclaimed`, `/app/treinamento`, `access-codes.tsx`, `video-manager.tsx`, `use-ai-training.ts`, `use-ai-chat.ts`.
- Copiar só componentes `ui/` e dependências que alguma tela usa de fato.
- Commits pequenos, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Foco de revisão

1. **Sessão expirada ou ausente ao gerar roteiro:** `/api/roteiro` responde 401 com `{ error: { message: "Faça login para gerar roteiros." } }`, e a tela mostra isso num toast, sem quebrar. *(Teste na Tarefa 5.)*
2. **IA devolve texto fora do formato** (cercas ```json, texto antes ou depois, ou nenhum `{`): o JSON é extraído quando existe. Quando não existe, a resposta é 502 com "A resposta da IA veio em formato inesperado. Tente de novo." e não um 500 genérico. *(Testes na Tarefa 5.)*
3. **`OPENROUTER_API_KEY` ou `OPENROUTER_MODEL` ausente:** 500 com "IA não configurada." antes de qualquer chamada externa. *(Teste na Tarefa 5.)*
4. **Chave secreta vazando para o navegador:** `src/lib/supabase/admin.ts` e `src/lib/roteiro.ts` importam `server-only`, e o build falha se um componente cliente os importar. *(Verificação na Tarefa 5.)*
5. **Link antigo `/app/treinamento` ou qualquer rota inexistente:** cai na página 404 com a marca Shop Studio e um link para `/`, sem tela branca. *(Verificação na Tarefa 4.)*

---

### Tarefa 1: Esqueleto Next + visual base

**Arquivos:**
- Criar: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts` (copiado de `ORIG/`, com `content: ["./src/**/*.{ts,tsx}"]`), `vitest.config.ts`, `src/app/globals.css` (= `ORIG/src/index.css` + `ORIG/src/App.css` se tiver algo usado), `src/app/layout.tsx`, `src/app/page.tsx` (provisório), `src/lib/utils.ts` (copiado), `.gitignore`, `.env.example`, `README.md`
- Teste: `src/lib/utils.test.ts`

**Interfaces:**
- Produz: alias `@/*` → `src/*`; `cn(...)` em `@/lib/utils`; variáveis CSS `--font-display` e `--font-sans` vindas de `next/font/google` e usadas no `fontFamily` do Tailwind (`display: ["var(--font-display)", "Georgia", "serif"]`, `sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"]`); `pnpm test` (vitest run).

- [ ] **Passo 1:** em `ShopStudioTTK/` (que já tem `docs/` e `.git`), rodar `pnpm create next-app@latest . --ts --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-tailwind` (se reclamar da pasta não vazia, gerar numa pasta temporária no scratchpad e mover os arquivos). Nome do pacote: `shop-studio`.
- [ ] **Passo 2:** adicionar Tailwind v3 com `pnpm add -D tailwindcss@3 postcss autoprefixer tailwindcss-animate @tailwindcss/typography`. Usar a typography só se `ORIG/tailwind.config.ts` usar. Copiar `tailwind.config.ts` e `index.css` → `src/app/globals.css`.
- [ ] **Passo 3:** fontes em `layout.tsx` com `next/font/google`: `Fraunces({ subsets: ["latin"], axes: ["opsz"], style: ["normal","italic"], variable: "--font-display" })` e `Inter({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-sans" })`, aplicadas no `<html lang="pt-BR">`. Metadata: `title: "Shop Studio — Como começar no TikTok Shop"`, `description: "O guia prático do Shop Studio em formato de app: 12 capítulos, assistente de IA e gerador de roteiros para sair do zero à primeira venda no TikTok Shop."`, `themeColor: "#F6E3E5"`, `applicationName`/`appleWebApp.title: "Shop Studio"`, `openGraph` com o mesmo texto do `ORIG/index.html` trocando o nome.
- [ ] **Passo 4:** Vitest: `pnpm add -D vitest`, com `vitest.config.ts` resolvendo `@` → `src`, ambiente `node`, e script `"test": "vitest run"`.
- [ ] **Passo 5:** teste `src/lib/utils.test.ts`: `expect(cn("px-2", "px-4")).toBe("px-4")`. Rodar `pnpm test`. Esperado: PASS.
- [ ] **Passo 6:** `.env.example` com as 5 variáveis vazias e um comentário por linha. README curto em português: o que é, `pnpm install`, `cp .env.example .env.local`, `pnpm dev`, `pnpm test`, Supabase local (Tarefa 2).
- [ ] **Passo 7:** `pnpm build && pnpm lint`. Esperado: os dois sem erro.
- [ ] **Passo 8:** commit `chore: esqueleto Next.js com Tailwind e fontes do Shop Studio`.

### Tarefa 2: Banco Supabase (migração única)

**Arquivos:**
- Criar: `supabase/config.toml` (via `pnpm supabase init`), `supabase/migrations/20261104000000_init.sql`, `src/integrations/supabase/types.ts` (gerado)
- Modificar: `package.json` (devDependency `supabase`, scripts `db:start`, `db:reset`, `db:types`)

**Interfaces:**
- Produz: tabelas `profiles`, `chapter_progress`, `checklist_progress`, `saved_scripts`, `success_cases`, `ai_config`, `ai_knowledge`, `access_codes`, `entitlements`, `chapter_videos`; função `redeem_access_code(codigo_input text) returns boolean`; bucket `studio-videos`; tipo `Database` exportado de `@/integrations/supabase/types`.

- [ ] **Passo 1:** `pnpm add -D supabase && pnpm supabase init`. Scripts: `"db:start": "supabase start"`, `"db:reset": "supabase db reset"`, `"db:types": "supabase gen types typescript --local > src/integrations/supabase/types.ts"`.
- [ ] **Passo 2:** escrever `20261104000000_init.sql` com o **estado final** das migrações de `ORIG/supabase/migrations/` (em ordem de nome), aplicando estas regras:
  - `ai_personas`: não cria (foi apagada em `migration_20261020_215541000`).
  - `ai_config`: sem a coluna `owner_id` e sem as políticas `ai_config_update_owner`/`ai_config_claim`. Fica só `ai_config_select_all`. A linha `default` é inserida com `nome`, `tom`, `persona`, `evitar` e `exemplos` copiados de `migration_20261021_185810000`, trocando "Shop Club" → "Shop Studio" e "o clube"/"do clube"/"no clube" → "o Studio"/"do Studio"/"no Studio".
  - `ai_knowledge`, `access_codes`, `chapter_videos`: mantêm a política de SELECT para `authenticated` (`access_codes` não tem nenhuma política para `authenticated`) e **não** têm política de escrita. Só a service role escreve.
  - `chapter_videos` já nasce com `colecao text not null default 'capitulo'` e `chapter_slug` aceitando nulo.
  - Storage: bucket `studio-videos` com os mesmos `public`, `file_size_limit` e `allowed_mime_types` de `migration_20261020_224223000`. Política de leitura pública renomeada `studio_videos_public_read`. Sem política de upload.
  - `redeem_access_code`: idêntica à de `migration_20261020_215815000`, com os mesmos `revoke`/`grant`.
  - Fora: todos os `update ... owner_id`, os `insert` de códigos de teste e os `delete` de vídeos/arquivos de teste.
- [ ] **Passo 3:** `pnpm db:start && pnpm db:reset`. Esperado: migração aplicada sem erro.
- [ ] **Passo 4:** verificação SQL (via `psql` na URL do `supabase status`):
  - `select count(*) from ai_config where id='default' and persona ilike '%Shop Studio%'` → 1;
  - `select count(*) from ai_config where persona ilike '%club%' or evitar ilike '%club%'` → 0;
  - `select to_regclass('public.ai_personas')` → nulo;
  - `select count(*) from pg_policies where tablename in ('access_codes','ai_knowledge','chapter_videos','ai_config') and cmd <> 'SELECT'` → 0.
- [ ] **Passo 5:** `pnpm db:types`. Esperado: `types.ts` gerado com as 10 tabelas e sem `ai_personas`/`owner_id`.
- [ ] **Passo 6:** commit `feat(db): migração inicial do Shop Studio`.

> **Ponto de parada com a dona:** a subida para o projeto Supabase de produção (`pnpm supabase link --project-ref <ref>` + `pnpm supabase db push`) só acontece quando ela fornecer o projeto. Até lá, tudo roda contra o Supabase local.

### Tarefa 3: Cliente Supabase, sessão e regra de acesso

**Arquivos:**
- Criar: `src/integrations/supabase/client.ts`, `src/lib/access.ts`, `src/lib/access.test.ts`, `src/hooks/use-auth.tsx` (porte de `ORIG/src/hooks/use-auth.tsx`), `src/hooks/use-access.ts` (porte enxuto), `src/app/providers.tsx`
- Modificar: `src/app/layout.tsx` (envolver com `<Providers>`)

**Interfaces:**
- Consome: `Database` (Tarefa 2).
- Produz:
  - `supabase` (cliente browser tipado, `persistSession`, `autoRefreshToken`, `localStorage`) em `@/integrations/supabase/client`, lendo `process.env.NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - `ACESSO_ABERTO_PARA_REVISAO = true`, `temAcesso(possuiEntitlement: boolean): boolean` e `gerarCodigo(): string` em `@/lib/access`. O comentário do modo revisão do original vem junto, sem nomes de pessoas.
  - `useAuth(): { user, session, loading, signOut }` e `AuthProvider`, com a mesma forma do original.
  - `useAccess(): { hasAccess: boolean; isLoading: boolean; redeem }`, sem `isOwner`/`isUnclaimed`/`useAccessCodes`.
  - `<Providers>` (cliente): `QueryClientProvider`, `AuthProvider`, `TooltipProvider`, `Toaster` do sonner e o `ErrorBoundary` portado.

- [ ] **Passo 1: teste que falha** em `src/lib/access.test.ts`:
  ```ts
  expect(temAcesso(true)).toBe(true);
  expect(temAcesso(false)).toBe(ACESSO_ABERTO_PARA_REVISAO);
  expect(gerarCodigo()).toMatch(/^SHOPSTUDIO-[A-Z0-9]{8}$/);
  ```
- [ ] **Passo 2:** `pnpm test src/lib/access.test.ts`. Esperado: FAIL (módulo não existe).
- [ ] **Passo 3:** implementar `access.ts`: `temAcesso = (p) => ACESSO_ABERTO_PARA_REVISAO || p`. `gerarCodigo` igual ao original, com prefixo `SHOPSTUDIO-` e 8 caracteres garantidos (`padEnd` caso `toString(36)` venha curto).
- [ ] **Passo 4:** `pnpm test`. Esperado: PASS.
- [ ] **Passo 5:** portar `client.ts`, `use-auth.tsx` (com `"use client"`), `use-access.ts` (`hasAccess = temAcesso(Boolean(entitlementQuery.data))`, sem a query de `ai_config`) e `providers.tsx`.
- [ ] **Passo 6:** `pnpm build`. Esperado: sem erro.
- [ ] **Passo 7:** commit `feat: sessão Supabase e regra de acesso compartilhada`.

### Tarefa 4: Rotas, casca do app e páginas portadas

**Arquivos:**
- Criar (porte de `ORIG/src/pages/*`; cada `page.tsx` é um wrapper fino que renderiza o componente portado com `"use client"`):
  - `src/app/page.tsx` ← `Root.tsx`
  - `src/app/entrar/page.tsx` ← `Auth.tsx`
  - `src/app/redefinir/page.tsx` ← `ResetPassword.tsx`
  - `src/app/not-found.tsx` ← `NotFound.tsx` (sem i18n, texto fixo: "Página não encontrada" + link "Voltar para o início")
  - `src/app/app/layout.tsx` ← `RequireAuth` + `RequireAccess` + `AppShell` (a guarda que redireciona usa `router.replace("/entrar")` em `useEffect`)
  - `src/app/app/page.tsx` ← `dashboard`; `capitulos/page.tsx` ← `chapters`; `capitulos/[slug]/page.tsx` ← `chapter-reader`; `roteiros/page.tsx` ← `scripts`; `checklist/page.tsx`; `resultados/page.tsx` ← `results`; `campeoes/page.tsx` ← `champioes`; `assistente/page.tsx` (Tarefa 6)
  - `src/components/**`, `src/content/**`, `src/hooks/use-progress.ts`, `src/hooks/use-videos.ts` (só as leituras), `src/hooks/use-mobile.tsx` e `src/lib/video.ts`, além de `src/lib/storage.ts` se algo restante usar, copiados de `ORIG/` conforme o uso.
- Não portar: `training.tsx`, `content/ai-training.ts`, `access-codes.tsx`, `video-manager.tsx`, `language-switcher.tsx`, `use-ai-training.ts`, `use-ai-chat.ts`, `analytics.ts`, `env.d.ts`, `i18n/`, `router.tsx`, `App.tsx`, `main.tsx`, `page-loader.tsx` (`lazyPage` some).

**Interfaces:**
- Consome: `useAuth`, `useAccess`, `supabase` (Tarefa 3).
- Produz: os caminhos da spec (`/`, `/entrar`, `/redefinir`, `/app`, `/app/capitulos`, `/app/capitulos/[slug]`, `/app/assistente`, `/app/roteiros`, `/app/checklist`, `/app/resultados`, `/app/campeoes`). O `AppShell` não tem o item "Treinamento" nem a prop `showTraining`.

Tabela de troca do react-router:

| Original | Next |
|---|---|
| `<Link to=…>` | `<Link href=…>` de `next/link` |
| `<NavLink>` com estado ativo | `Link` + `usePathname()` |
| `useNavigate()` / `navigate(x, {replace})` | `useRouter()` / `router.push` ou `router.replace` |
| `<Navigate to=… replace/>` | `useEffect(() => router.replace(…))` + o mesmo loader |
| `useParams()` | `useParams<{ slug: string }>()` de `next/navigation` |
| `useSearchParams()` | `useSearchParams()` de `next/navigation` (envolver a página em `<Suspense>`) |
| `useLocation().state.from` | `?de=<caminho>` na URL do `/entrar` |
| `<Outlet/>` | `{children}` do layout |

- [ ] **Passo 1:** copiar `content/` e os componentes usados. Rodar `pnpm build` a cada grupo de páginas portado.
- [ ] **Passo 2:** portar casca e guardas (`app/app/layout.tsx`), `/`, `/entrar`, `/redefinir` e a 404. Os redirects de e-mail continuam `${window.location.origin}/` e `${window.location.origin}/redefinir`.
- [ ] **Passo 3:** portar as páginas de `/app/*` (menos o assistente).
- [ ] **Passo 4:** com `pnpm db:start` e `.env.local` apontando para o Supabase local (URL e chaves do `supabase status`; e-mails aparecem no Inbucket/Mailpit local), rodar `pnpm dev` e conferir à mão:
  - criar conta, entrar e sair;
  - redefinir senha pelo link do e-mail local;
  - abrir um capítulo e marcar como concluído (o progresso aparece no menu);
  - marcar um item do checklist;
  - cadastrar um caso de sucesso em `/app/resultados`;
  - abrir `/app/campeoes`;
  - abrir `/app/treinamento` → 404 com a marca e o link para `/`.
- [ ] **Passo 5:** com `ACESSO_ABERTO_PARA_REVISAO = false` (só local, sem commitar), uma conta sem código cai no desbloqueio. Depois de `insert into access_codes(code) values ('SHOPSTUDIO-TESTE001')` via psql, o código libera. Voltar a constante para `true`.
- [ ] **Passo 6:** `pnpm build && pnpm lint`. Esperado: sem erro.
- [ ] **Passo 7:** commit `feat: porta casca, guardas e páginas do app para o Next`.

### Tarefa 5: Rota `/api/roteiro` com OpenRouter

**Arquivos:**
- Criar: `src/lib/supabase/admin.ts`, `src/lib/roteiro.ts`, `src/lib/roteiro.test.ts`, `src/app/api/roteiro/route.ts`, `src/app/api/roteiro/route.test.ts`
- Modificar: `src/components/script-generator.tsx` (só a `mutationFn` de `generate`)

**Interfaces:**
- Consome: `temAcesso` (Tarefa 3), `Database` (Tarefa 2).
- Produz:
  - `createAdminClient(): SupabaseClient<Database>` em `@/lib/supabase/admin` (`import "server-only"`, service role, `auth: { persistSession: false }`).
  - Em `@/lib/roteiro` (`import "server-only"`):
    - `type ScriptInput = { produto: string; publico: string; beneficio: string; formato: string }`;
    - `type ScriptResult` (mesmo do `script-generator.tsx`);
    - `METHOD` e `SYSTEM_PROMPT`: texto exato de `ORIG/supabase/functions/ai-script/index.ts`, com "Shop Club" → "Shop Studio";
    - `buildSystemPrompt(config: { tom?: string|null; persona?: string|null; evitar?: string|null } | null, knowledge: { titulo: string; conteudo: string }[]): string`, que reproduz `trainingBlock` e `knowledgeBlock` do original (no máximo 20 itens, `conteudo` cortado em 600);
    - `buildUserPrompt(input: ScriptInput): string`, com os mesmos defaults do original;
    - `extractScriptJson(content: string): ScriptResult`, que lança `Error("A resposta da IA veio em formato inesperado. Tente de novo.")`.
  - `POST /api/roteiro`: corpo `ScriptInput`, header `Authorization: Bearer <access_token>`. Sucesso: 200 com `ScriptResult`. Erro: `{ error: { message: string } }` com os status abaixo.

| Situação | Status | `message` |
|---|---|---|
| env OpenRouter ausente | 500 | "IA não configurada." |
| sem Bearer ou token inválido | 401 | "Faça login para gerar roteiros." |
| sem acesso (`temAcesso` falso) | 403 | "Seu acesso ainda não foi liberado." |
| `produto` vazio | 400 | "Diga qual é o produto." |
| OpenRouter não-ok | 502 | `error.message` da OpenRouter ou "Não consegui gerar o roteiro agora." |
| JSON inválido na resposta | 502 | mensagem do `extractScriptJson` |

Chamada: `POST https://openrouter.ai/api/v1/chat/completions`, headers `Authorization: Bearer ${OPENROUTER_API_KEY}`, `Content-Type: application/json`, `X-Title: Shop Studio`. Corpo: `{ model: OPENROUTER_MODEL, messages: [system, user], stream: false, temperature: 0.8, max_tokens: 1400 }`. `export const runtime = "nodejs"`.

- [ ] **Passo 1: testes que falham** em `src/lib/roteiro.test.ts` (com `vi.mock("server-only", () => ({}))`):
  - `extractScriptJson('```json\n{"ganchos":["a"]}\n```')` → `{ ganchos: ["a"] }`;
  - `extractScriptJson('Claro! {"ctas":["x"]} espero ter ajudado')` → `{ ctas: ["x"] }`;
  - `extractScriptJson("sem json")` lança "A resposta da IA veio em formato inesperado. Tente de novo.";
  - `buildUserPrompt({ produto: "Sérum", publico: "", beneficio: "", formato: "" })` contém `"Público: mulheres brasileiras que compram por impulso no TikTok"` e `"Formato desejado: conselho de amiga"`;
  - `SYSTEM_PROMPT` contém "Shop Studio" e não contém "Club";
  - `buildSystemPrompt(null, [])` === `SYSTEM_PROMPT`;
  - `buildSystemPrompt(null, Array.from({length: 25}, (_, i) => ({ titulo: "t"+i, conteudo: "x".repeat(700) })))` contém `t19`, não contém `t20` e não contém `"x".repeat(601)`.
- [ ] **Passo 2:** `pnpm test src/lib/roteiro.test.ts`. Esperado: FAIL.
- [ ] **Passo 3:** implementar `src/lib/roteiro.ts`.
- [ ] **Passo 4:** `pnpm test src/lib/roteiro.test.ts`. Esperado: PASS.
- [ ] **Passo 5: testes que falham** em `route.test.ts`, mockando `@/lib/supabase/admin` (`auth.getUser`, `from(...).select/eq/maybeSingle/order`), `@/lib/access` (`temAcesso`) e `global.fetch`, e definindo as env por `vi.stubEnv`. Um teste por linha da tabela de status (status + `message`) e mais:
  - **sucesso:** `fetch` chamado uma vez com URL da OpenRouter, `body.model === process.env.OPENROUTER_MODEL` e header `Authorization` com a chave, e a resposta 200 igual ao JSON extraído;
  - **ordem:** com env ausente, `getUser` e `fetch` nunca são chamados.
- [ ] **Passo 6:** `pnpm test src/app/api/roteiro`. Esperado: FAIL.
- [ ] **Passo 7:** implementar `admin.ts` e `route.ts` na ordem: env → token (`supabase.auth.getUser(token)`) → acesso (`entitlements` por `user_id`) → corpo → `ai_config`/`ai_knowledge`. As duas leituras são opcionais: se falharem, segue com `null`/`[]`. Depois vêm OpenRouter → `extractScriptJson`.
- [ ] **Passo 8:** `pnpm test`. Esperado: tudo PASS.
- [ ] **Passo 9:** em `script-generator.tsx`, `generate.mutationFn` pega o token com `supabase.auth.getSession()`, faz `fetch("/api/roteiro", { method: "POST", headers: { "Content-Type": "application/json", Authorization: \`Bearer ${token}\` }, body: JSON.stringify({ produto, publico, beneficio, formato }) })`, lança `new Error(json.error?.message ?? "Não consegui gerar o roteiro.")` quando `!res.ok` e devolve `ScriptResult`. O resto do componente não muda.
- [ ] **Passo 10:** verificação de vazamento: importar `@/lib/roteiro` temporariamente num componente `"use client"` e rodar `pnpm build`. Esperado: o build falha citando `server-only`. Desfazer a importação.
- [ ] **Passo 11:** manual, com `.env.local` tendo `OPENROUTER_API_KEY` e um `OPENROUTER_MODEL` qualquer de teste: gerar um roteiro em `/app/roteiros`, salvar e ver na biblioteca. Sem chave, o toast mostra "IA não configurada.".
- [ ] **Passo 12:** `pnpm build && pnpm lint`, depois commit `feat: gerador de roteiros via OpenRouter`.

### Tarefa 6: Assistente sem IA

**Arquivos:**
- Criar: `src/app/app/assistente/page.tsx` (porte de `ORIG/src/pages/app/assistant.tsx`)

**Interfaces:**
- Consome: `getChapter` de `@/content/chapters`.
- Produz: a tela com o mesmo cabeçalho e layout, sem `useAiChat`/`useAiTraining`, sem botão "Treinamento da IA" e com o campo de mensagem e o botão de enviar desabilitados. Um aviso no lugar da conversa diz: "O assistente está sendo preparado e chega em breve. Enquanto isso, use o gerador de roteiros e os capítulos." Se o original lê `?capitulo=` para contexto, a leitura continua, mas sem efeito além do texto exibido.

- [ ] **Passo 1:** portar a página conforme acima.
- [ ] **Passo 2:** `pnpm dev`, abrir `/app/assistente` e `/app/assistente?capitulo=<slug-válido>`. Esperado: a tela renderiza sem erro no console e os controles ficam desabilitados.
- [ ] **Passo 3:** `pnpm build && pnpm lint`, depois commit `feat: tela do assistente sem IA, aguardando nova integração`.

### Tarefa 7: Identidade "SS", manifesto e varredura final

**Arquivos:**
- Criar: `src/app/icon.tsx` (com `generateImageMetadata` para 32, 192 e 512), `src/app/apple-icon.tsx` (180), `src/app/manifest.ts`, `src/app/_fonts/Fraunces-SemiBold.ttf` (do repositório oficial Google Fonts, licença OFL, junto com `OFL.txt`)
- Modificar: `src/components/brand.tsx` e os pontos onde o wordmark quebra

**Interfaces:**
- Produz: ícones "ss" em minúsculas, Fraunces semibold, cor `hsl(var(--foreground))` do original (chocolate `#311D16`) sobre `#F6E3E5`, com centralização e proporção iguais às do `ORIG/public/icon-192.png`. Manifesto com `name`/`short_name: "Shop Studio"` e os demais campos de `ORIG/public/manifest.webmanifest`, apontando para os ícones gerados.

- [ ] **Passo 1:** gerar os ícones com `ImageResponse` de `next/og` (já vem no Next, sem dependência nova), carregando o TTF com `readFile`. Não copiar os PNGs de `ORIG/public`.
- [ ] **Passo 2:** `Wordmark` com "shop studio" / "shop" + "studio", mantendo o ponto rosa. Em `pnpm dev`, conferir em 375 px e 1280 px de largura o menu lateral, o cabeçalho mobile, os loaders, `/entrar` e a 404. Se algum ponto quebrar linha ou estourar, reduzir só o `text-[…]` daquele uso.
- [ ] **Passo 3:** abrir `/icon/192`, `/apple-icon` e `/manifest.webmanifest`. Esperado: "ss" correto e manifesto com "Shop Studio".
- [ ] **Passo 4:** varredura (fora de `node_modules`, `.next` e `docs/`):
  ```bash
  grep -rniE "enter\.pro|opentrust|@enter-pro|enter-dev|ENTER_|EnterCloud|shop ?club|shopclub|club-videos|i18next|owner_id|isOwner|isUnclaimed|treinamento" --exclude-dir={node_modules,.next,docs,.git} .
  ```
  Esperado: nenhuma linha. `treinamento` só pode aparecer em texto de conteúdo legítimo dos capítulos. Se aparecer, conferir caso a caso.
- [ ] **Passo 5:** `pnpm test && pnpm build && pnpm lint`. Esperado: tudo verde.
- [ ] **Passo 6:** commit `feat: identidade provisória SS e manifesto do Shop Studio`.
