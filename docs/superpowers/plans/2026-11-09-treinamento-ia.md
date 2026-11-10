# Treinamento da IA — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página de Treinamento só para admin, onde a expert responde perguntas (mapeadas, das conversas das alunas e criadas na hora), e o assistente usa essas respostas por embedding (≥ 0,9 quase palavra por palavra, ≥ 0,7 como modelo).

**Architecture:** Tabelas `admins`, `treinamento_conversas` e `treinamento` (pgvector, 1536 d) numa migration. Guarda `admin()` no servidor em toda rota de treinamento. `src/lib/embedding.ts` chama a OpenRouter; `src/lib/treinamento.ts` guarda limiares, o texto do embedding com contexto, a busca e o bloco do prompt. `/api/assistente` busca as respostas da expert antes de chamar a IA e, no fim do stream, grava a pergunta na conversa da fila.

**Tech Stack:** Next.js 16 (App Router), Postgres/Supabase + pgvector, `postgres` (db()), OpenRouter (`/api/v1/embeddings`), React Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-treinamento-ia-design.md`

## Global Constraints

- Textos de interface, erros, comentários e commits em português do Brasil. Produto sempre "Shop Studio".
- Migration nova `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`, RLS ligado, **sem** políticas nem grants para `anon`/`authenticated` (`revoke all … from anon, authenticated`). Depois: `pnpm supabase migration up` e `pnpm db:types`. Nunca `pnpm db:reset`.
- Segredos (`OPENROUTER_API_KEY`, `DATABASE_URL`) só em módulos com `import "server-only"`; nunca importar `embedding.ts`/`treinamento.ts` em componente cliente. Nunca ler/imprimir o `.env.local`.
- Toda consulta com valor usa o template `db()\`…${v}\``. Dado de aluna filtra por `user_id = ${userId}` do token, nunca do corpo.
- `treinamento` não tem `user_id` de aluna; nenhuma rota de admin devolve `user_id`, `embedding` ou `respondido_por`.
- Nada variável antes do `BASE_PROMPT`; o bloco da expert vai **no fim** do system prompt.
- Limiares: `LIMIAR_QUASE_IGUAL = 0.9`, `LIMIAR_EXEMPLO = 0.7`, `LIMIAR_PARECIDA = 0.6`; até 4 exemplos; contexto = até 2 perguntas anteriores.
- Tamanhos: pergunta ≤ 1000, resposta ≤ 4000 (corta com `texto()` de `src/lib/entrada.ts`).
- Embedding: `OPENROUTER_EMBEDDING_MODEL`, padrão `openai/text-embedding-3-small`, 1536 dimensões, timeout 5000 ms.
- Visual 2.0: tokens de `globals.css`, sem cores fixas; `variant="pop"` no botão principal ("Nova pergunta").
- Testes em `tests/` espelhando `src/`, escritos antes do código. Ao fim de cada tarefa: `pnpm test && pnpm lint` limpos; no fim do plano também `pnpm build`.
- Commits pequenos terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Aluna mandando `conversa` de outra aluna** → a linha vai para uma conversa nova dela (par `user_id` + `conversa_cliente`), nunca para a da outra. Teste na Tarefa 5 (`isolamento.test.ts`).
- **Embedding fora do ar / sem chave** → o assistente responde sem bloco e a fila grava com `embedding = null`; a tela de treinamento salva com `indexada: false`. Testes nas Tarefas 4 e 5.
- **Resposta cortada (`finish_reason: "length"`) ou vazia** → não entra na fila. Teste na Tarefa 5.
- **Aluna sem conta em `admins` chamando PATCH com `respondido_por` no corpo** → 403 antes de qualquer consulta em `treinamento`; e, para admin, `respondido_por` é sempre o token. Testes na Tarefa 4.
- **Pergunta de referência é a própria pergunta** (a mesma linha já respondida) → `parecida` nunca aponta para si. Teste na Tarefa 4.

---

### Task 1: Migration (admins, conversas, treinamento, pgvector, perguntas mapeadas)

**Files:**
- Create: `supabase/migrations/20261109000000_treinamento.sql`
- Modify: `src/integrations/supabase/types.ts` (gerado)

**Interfaces:**
- Produces: tabelas `public.admins(user_id, criado_em)`, `public.treinamento_conversas(id, user_id, conversa_cliente, criado_em)`, `public.treinamento(id, origem, status, conversa_id, ordem, contexto, pergunta, resposta_ia, resposta, embedding, criado_em, respondido_por, respondido_em)`, exatamente como no SQL da spec ("Banco"). Extensão `vector` em `extensions`.

- [ ] **Step 1: Escrever a migration** com o SQL da spec, RLS ligado e `revoke all … from anon, authenticated` nas três tabelas, e o seed das 25 perguntas (`origem = 'mapeada'`), com este texto exato:

```
Como eu ativo minha conta de afiliada no TikTok Shop?
Preciso mesmo de 2 mil seguidores pra começar a vender?
Quantos vídeos eu tenho que postar por dia?
Como eu faço um gancho bom pros primeiros segundos?
Vale mais a pena nichar ou falar de vários produtos?
Como eu escolho um produto que vende?
Qual a diferença entre amostra grátis e amostra reembolsável?
Meu pedido de amostra foi recusado. E agora?
O produto do vídeo precisa ser igual ao do link?
Como coloco o link do produto no vídeo?
Quanto eu ganho de comissão por venda?
Como funcionam os níveis de criadora?
Posso usar música viral no vídeo com produto?
Quanto tempo deve ter um vídeo pra vender?
Como faço o 5x5 antes de gravar?
Tenho vergonha de aparecer. Dá pra vender sem mostrar o rosto?
Já postei vários vídeos e não vendi nada. O que eu tô fazendo de errado?
Vale a pena comprar seguidores pra chegar nos 2 mil?
Sou menor de idade, posso ser afiliada?
Posso usar uma conta antiga que eu tinha parada?
Live ajuda a crescer mais rápido?
Devo impulsionar meus vídeos com anúncio?
Qual o melhor horário pra postar?
Vejo outras meninas vendendo muito e eu não. Como não desanimar?
Penso em desistir. Vale a pena continuar?
```

- [ ] **Step 2: Aplicar** — Run: `pnpm supabase migration up` → Expected: aplica `20261109000000_treinamento.sql` sem erro.

- [ ] **Step 3: Conferir no banco local** (psql com o `DB_URL` do `pnpm supabase status`):
  - `select count(*) from public.treinamento where origem='mapeada'` → 25;
  - `select grantee from information_schema.role_table_grants where table_name in ('admins','treinamento','treinamento_conversas') and grantee in ('anon','authenticated')` → 0 linhas;
  - `select relrowsecurity from pg_class where relname in ('admins','treinamento','treinamento_conversas')` → todas `t`;
  - `show search_path` como o usuário do `DATABASE_URL` inclui `extensions` (o operador `<=>` precisa estar visível; se não estiver, as consultas das tarefas seguintes usam `operator(extensions.<=>)`) — anote o resultado no commit.

- [ ] **Step 4:** Run: `pnpm db:types` → `types.ts` passa a ter as três tabelas.

- [ ] **Step 5: Commit** `feat(treinamento): tabelas de admin, conversas e treinamento com pgvector`

---

### Task 2: Guarda `admin()` e `admin` no `GET /api/acesso`

**Files:**
- Modify: `src/lib/api-auth.ts`, `src/app/api/acesso/route.ts`, `src/hooks/use-access.ts`
- Test: `tests/lib/api-auth-admin.test.ts` (novo), `tests/app/api/isolamento.test.ts` (caso do acesso)

**Interfaces:**
- Produces: `admin(req: Request, rotulo: string): Promise<Logada | Response>` — `autenticar(req, rotulo, "Faça login.")` + `select 1 from public.admins where user_id = ${userId}`; sem linha → `erro("Acesso restrito à administração.", 403)`; exceção do banco → `erro("Não consegui verificar seu acesso agora.", 500)`.
- Produces: `ehAdmin(userId: string): Promise<boolean>` (a consulta acima), usada também pelo acesso.
- Produces: `GET /api/acesso` → `{ acesso, trocarSenha?, admin?: true }` (`admin` só aparece quando verdadeiro). `useAccess()` passa a expor `isAdmin: boolean`.

- [ ] **Step 1: Testes que falham**
  - `admin()`: conta em `admins` → devolve `{ userId: "u1" }`; sem linha → 403 com "Acesso restrito à administração."; consulta de `admins` lança → 500; sem token → 401 sem consultar `admins`; senha temporária pendente → 403 (vem do `autenticar`).
  - A consulta de `admins` tem `valores` `["u1"]` (do token).
  - `acesso GET`: com linha em `admins` → JSON tem `admin: true`; sem → a chave `admin` não existe (`expect(json).not.toHaveProperty("admin")`).
- [ ] **Step 2:** Run `pnpm test tests/lib/api-auth-admin.test.ts tests/app/api/isolamento.test.ts` → FAIL (`admin` não existe).
- [ ] **Step 3: Implementar** `ehAdmin`, `admin`, o campo no acesso (via `Promise.all` junto das outras leituras) e `isAdmin` no hook.
- [ ] **Step 4:** Run os mesmos testes → PASS; `pnpm test && pnpm lint` limpos.
- [ ] **Step 5: Commit** `feat(admin): guarda admin() conferida no banco a cada chamada`

---

### Task 3: Embedding e regras do treinamento (`embedding.ts`, `treinamento.ts`)

**Files:**
- Create: `src/lib/embedding.ts`, `src/lib/treinamento.ts`
- Test: `tests/lib/embedding.test.ts`, `tests/lib/treinamento.test.ts`

**Interfaces:**
- Produces (`embedding.ts`, `server-only`): `gerarEmbedding(texto: string): Promise<number[]>` — lança se faltar `OPENROUTER_API_KEY`, se a resposta não for ok, se o vetor não tiver 1536 números, ou no timeout (`AbortSignal.timeout(5000)`). Corpo: `{ model: process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small", input: texto }`; lê `data[0].embedding`.
- Produces (`treinamento.ts`, `server-only`):
  - `LIMIAR_QUASE_IGUAL = 0.9`, `LIMIAR_EXEMPLO = 0.7`, `LIMIAR_PARECIDA = 0.6`, `MAX_EXEMPLOS = 4`, `MAX_CONTEXTO = 2`.
  - `textoParaEmbedding(contexto: string[], pergunta: string): string` — usa só as `MAX_CONTEXTO` últimas do contexto; sem contexto devolve a pergunta igual. Formato com contexto: `"Perguntas anteriores:\n- a\n- b\nPergunta: p"`.
  - `vetorSql(v: number[]): string` — `JSON.stringify(v)` (vai como parâmetro com `::extensions.vector`).
  - `type RespostaDaExpert = { pergunta: string; resposta: string; similaridade: number }`.
  - `buscarRespostasDaExpert(vetor: number[]): Promise<RespostaDaExpert[]>` — as `MAX_EXEMPLOS` respondidas mais próximas (`status = 'respondida' and embedding is not null`, ordem por `embedding <=> v`), com `1 - (embedding <=> v) as similaridade`.
  - `blocoDaExpert(r: RespostaDaExpert[]): string` — `""` se nenhuma ≥ `LIMIAR_EXEMPLO`; se a melhor ≥ `LIMIAR_QUASE_IGUAL`, o bloco "A ESPECIALISTA JÁ RESPONDEU ESTA PERGUNTA…" só com ela; senão o bloco "RESPOSTAS DA ESPECIALISTA A PERGUNTAS PARECIDAS…" com as ≥ `LIMIAR_EXEMPLO`. Texto das instruções exatamente como na spec (Assistente, passo 3), pares no formato `Pergunta: …\nResposta da especialista: …`.

- [ ] **Step 1: Testes que falham**
  - `gerarEmbedding`: chama `https://openrouter.ai/api/v1/embeddings` com `Authorization: Bearer chave` e o modelo padrão; usa `OPENROUTER_EMBEDDING_MODEL` quando definido; lança sem chave (sem chamar `fetch`), com status 500 e com vetor de tamanho ≠ 1536.
  - `textoParaEmbedding([], "p")` → `"p"`; com `["a","b","c"]` → contém `b` e `c`, não contém `a`.
  - `blocoDaExpert`: `[]` → `""`; melhor 0,65 → `""`; `[0.95, 0.8]` → contém "JÁ RESPONDEU" e só a primeira resposta; `[0.85, 0.75, 0.5]` → contém "PARECIDAS", as duas primeiras e não a terceira.
  - `buscarRespostasDaExpert`: a consulta tem `status = 'respondida'`, `limit` 4 e o vetor como valor (com o db falso).
- [ ] **Step 2:** Run `pnpm test tests/lib/embedding.test.ts tests/lib/treinamento.test.ts` → FAIL.
- [ ] **Step 3: Implementar** os dois módulos.
- [ ] **Step 4:** Run → PASS; `pnpm test && pnpm lint` limpos.
- [ ] **Step 5: Commit** `feat(treinamento): embedding pela OpenRouter e regras de semelhança`

---

### Task 4: Rotas `/api/treinamento` (GET/POST/PATCH/DELETE)

**Files:**
- Create: `src/app/api/treinamento/route.ts`
- Modify: `tests/app/api/protecao.test.ts`
- Test: `tests/app/api/treinamento/route.test.ts`

**Interfaces:**
- Consumes: `admin()` (Tarefa 2); `gerarEmbedding`, `textoParaEmbedding`, `vetorSql`, `LIMIAR_PARECIDA` (Tarefa 3); `texto` de `src/lib/entrada.ts`.
- Produces (JSON para a tela, Tarefa 6):
  - `type PerguntaTreino = { id: string; origem: "mapeada"|"aluna"|"admin"; status: "pendente"|"respondida"|"descartada"; pergunta: string; contexto: string | null; resposta_ia: string | null; resposta: string | null; indexada: boolean; criado_em: string; respondido_em: string | null; parecida: { id: string; pergunta: string; resposta: string; similaridade: number } | null }`
  - `GET ?status=` → `{ conversas: { id: string; criado_em: string; perguntas: PerguntaTreino[] }[]; soltas: PerguntaTreino[]; contagem: Record<"pendente"|"respondida"|"descartada", number> }`. Em `pendente`: `conversas` = conversas com pelo menos uma pendente, com **todas** as perguntas delas em `ordem`; `soltas` = mapeada/admin pendentes. Em `respondida`/`descartada`: `conversas = []` e `soltas` = todas as perguntas daquele status (inclusive as de aluna, com `contexto`). Status inválido ou ausente → `pendente`.
  - `parecida`: `left join lateral` na respondida mais próxima com `embedding` não nulo, `id <> t.id`, `1 - distância >= LIMIAR_PARECIDA`.
  - `POST {pergunta, resposta}` → 201 `{ id, indexada }` (origem `admin`, status `respondida`, `respondido_por` = token).
  - `PATCH {id, pergunta?, resposta?, status?}` → 200 `{ indexada }`. `resposta` presente → status `respondida`, `respondido_por`/`respondido_em`. `status: "pendente"|"descartada"` sem resposta → só muda o status. `pergunta` presente → embedding refeito com `textoParaEmbedding(contexto da linha, pergunta)`. Linha inexistente → 404.
  - `DELETE {id}` → 204; inexistente → 404.
  - Erros 400: id que não é uuid, `status` fora dos três, `POST` sem pergunta ou resposta, `PATCH` sem nenhum campo, `status: "respondida"` sem `resposta`.
  - Falha de `gerarEmbedding` → grava com `embedding = null`, `indexada: false` (nunca 500 por isso).

- [ ] **Step 1: Testes que falham**
  - `protecao.test.ts`: novo `const ADMIN = new Set(["treinamento GET","treinamento POST","treinamento PATCH","treinamento DELETE"])`; para eles, conta com acesso mas sem linha em `admins` → 403 e `naTabela("treinamento")` vazio (e nenhuma consulta com `public.treinamento`). Os testes de 401 já existentes cobrem as rotas novas sozinhos; manter `soChecagens()` aceitando também `public.admins`.
  - `route.test.ts` (com `responderCom([["from public.admins",[{}]], …])`):
    - GET agrupa as linhas de aluna por `conversa_id` em `ordem`; o JSON não tem `user_id`, `embedding` nem `respondido_por` em nenhum nível;
    - `parecida` vem `null` quando a consulta não devolve vizinha; o SQL tem `id <>` e o limiar 0.6 nos valores;
    - PATCH com `{ id, resposta: "r", respondido_por: "u2" }` grava `respondido_por = "u1"`;
    - PATCH com resposta de 5000 caracteres grava 4000;
    - PATCH com `status: "x"` → 400; id `"abc"` → 400; `{ id }` sozinho → 400;
    - POST com `fetch` do embedding rejeitando → 201 `{ indexada: false }` e insert com embedding `null`;
    - PATCH de linha inexistente (update sem linhas) → 404; DELETE idem.
- [ ] **Step 2:** Run `pnpm test tests/app/api` → FAIL.
- [ ] **Step 3: Implementar** a rota (`runtime = "nodejs"`), toda função começando por `admin(req, "treinamento")`.
- [ ] **Step 4:** Run → PASS; `pnpm test && pnpm lint` limpos.
- [ ] **Step 5: Commit** `feat(treinamento): rotas da fila, só para admin`

---

### Task 5: Assistente usa as respostas da expert e grava as conversas na fila

**Files:**
- Modify: `src/lib/uso.ts`, `src/lib/assistente.ts`, `src/app/api/assistente/route.ts`, `src/hooks/use-ai-chat.ts`
- Create: função de gravação em `src/lib/treinamento.ts`
- Test: `tests/lib/uso.test.ts`, `tests/lib/assistente.test.ts`, `tests/app/api/assistente/route.test.ts`, `tests/app/api/isolamento.test.ts`

**Interfaces:**
- Consumes: Tarefa 3 (`gerarEmbedding`, `textoParaEmbedding`, `buscarRespostasDaExpert`, `blocoDaExpert`).
- Produces:
  - `comRegistroDeUso(corpo, aoTerminar: (uso: Uso | null, fim: { texto: string; finishReason: string | null }) => …)` — junta `choices[0].delta.content` e guarda o último `finish_reason`. Os chamadores atuais continuam funcionando (segundo argumento opcional para eles).
  - `buildAssistantSystemPrompt(config, knowledge, chapterTitle?, expert = "")` — `expert` (o texto de `blocoDaExpert`) vai depois de tudo, separado por `\n\n`.
  - `registrarNaFila(p: { userId: string; conversa: string; contexto: string[]; pergunta: string; respostaIa: string; vetor: number[] | null }): Promise<void>` em `treinamento.ts` — `insert … into public.treinamento_conversas (user_id, conversa_cliente) values (${userId}, ${conversa}) on conflict (user_id, conversa_cliente) do update set user_id = excluded.user_id returning id` (ou equivalente que devolva o id nos dois casos); `ordem` = `coalesce(max(ordem), 0) + 1` da conversa; `contexto` = as `MAX_CONTEXTO` anteriores juntadas por `\n` (null se vazio); `pergunta` cortada em 1000. Lança em erro (quem chama loga).
  - Corpo do `POST /api/assistente` aceita `conversa` (uuid); `useAiChat` gera `crypto.randomUUID()` ao montar e a cada "Nova conversa" (a função de limpar já existente) e manda no corpo.

- [ ] **Step 1: Testes que falham**
  - `uso.test.ts`: dois deltas `"Oi"` + `" amiga"` e `finish_reason: "stop"` → `fim = { texto: "Oi amiga", finishReason: "stop" }`; o stream repassado continua idêntico.
  - `assistente.test.ts`: `buildAssistantSystemPrompt(null, [], undefined, "BLOCO").startsWith(BASE_PROMPT)` e termina com `"BLOCO"`; sem `expert`, igual ao de hoje.
  - `route.test.ts` (embedding pelo `global.fetch` por URL: `/embeddings` → vetor de 1536; `/chat/completions` → o SSE):
    - busca com similaridade 0,95 → o system prompt enviado contém "JÁ RESPONDEU"; 0,8 → "PARECIDAS"; 0,5 → nenhum dos dois;
    - `/embeddings` rejeitando → 200, prompt sem bloco, nenhuma consulta em `public.treinamento` de busca, e a fila grava com embedding `null`;
    - o texto embedado com 3 mensagens da aluna contém as 2 anteriores;
    - fim do stream com `conversa` válido → insert em `treinamento_conversas` com valores `["u1", conversa]` e insert em `treinamento` com `origem 'aluna'`, `resposta_ia = "Oi"`, sem `user_id`;
    - `conversa` ausente ou `"abc"` → nenhuma consulta em `treinamento_conversas`;
    - SSE com `finish_reason: "length"` ou sem texto → nada na fila;
    - falha ao gravar na fila → a aluna recebe o stream inteiro (status 200) e o erro vai para `console.error`.
  - `isolamento.test.ts`: assistente com `{ conversa: ID, user_id: "u2" }` no corpo → a consulta em `treinamento_conversas` usa `"u1"`.
- [ ] **Step 2:** Run `pnpm test tests/lib tests/app/api` → FAIL.
- [ ] **Step 3: Implementar.** Na rota: depois de `reservarChamada`, `Promise.all([configDaIA(), embedding+busca com catch → { vetor: null, respostas: [] }])`; `blocoDaExpert(respostas)` vai para o prompt; no `aoTerminar`, além de `registrarCusto`, se `conversa` válido, `fim.texto` não vazio e `fim.finishReason !== "length"`, `registrarNaFila(...)` com `.catch(console.error)`.
- [ ] **Step 4:** Run → PASS; `pnpm test && pnpm lint` limpos.
- [ ] **Step 5: Commit** `feat(assistente): respostas da expert no prompt e conversas na fila de treinamento`

---

### Task 6: Tela `/app/treinamento` e item no menu

**Files:**
- Create: `src/app/app/treinamento/page.tsx`, `src/components/treinamento.tsx` (cartões e formulários)
- Modify: `src/components/app/app-shell.tsx`

**Interfaces:**
- Consumes: `useAccess().isAdmin` (Tarefa 2); rotas e tipos JSON da Tarefa 4 (redeclarar `PerguntaTreino` no componente — não importar a rota).

- [ ] **Step 1: Menu.** Grupo "Admin" com `{ to: "/app/treinamento", label: "Treinamento", icon: GraduationCap }`, renderizado só com `isAdmin`; não entra na barra inferior do celular.
- [ ] **Step 2: Página.** `useQuery(["treinamento", status], () => api("/api/treinamento?status=" + status))`; abas Pendentes · Respondidas · Descartadas com a `contagem`; chips de origem (Todas · Mapeadas · Alunas · Criadas) filtrando no cliente; 403 da rota → "Esta página é só da administração." Mutations (`PATCH`/`POST`/`DELETE`) invalidam `["treinamento"]` e mostram toast (`sonner`) com "não indexada — salve de novo" quando `indexada: false`.
- [ ] **Step 3: Cartões.**
  - Conversa: título "Conversa de aluna" + data; cada pergunta em ordem com "o que a IA respondeu" (texto menor, `text-muted-foreground`) e ações **Responder** (textarea, máx. 4000, contador), **Aprovar a da IA** (PATCH com `resposta = resposta_ia`), **Descartar**.
  - Solta: pergunta + selo da origem + as mesmas ações (sem "Aprovar a da IA" se `resposta_ia` for nulo); `contexto` aparece em cinza quando houver.
  - `parecida`: "Parecida com: {pergunta} ({round(similaridade*100)}%)" que expande a referência com a resposta editável (PATCH no id dela).
  - Respondidas: editar pergunta e resposta, "Voltar para pendente", "Apagar" (confirmação dentro da tela, sem `window.confirm`).
  - Botão **Nova pergunta** (`variant="pop"`) abre formulário com pergunta (≤ 1000) e resposta (≤ 4000).
- [ ] **Step 4: Conferir no navegador** em `http://localhost:3000` (nunca `127.0.0.1`): criar conta de teste pelo webhook (ver CLAUDE.md, "Testar telas logadas"), inserir o `user_id` dela em `public.admins` pelo psql, entrar, ver as 25 mapeadas, responder uma, criar uma nova, descartar e voltar uma; sem a linha em `admins`, o menu some e a URL mostra a mensagem de acesso restrito; 390 px sem rolagem lateral; console sem erro.
- [ ] **Step 5:** `pnpm test && pnpm lint` limpos. **Commit** `feat(treinamento): tela da fila para a expert`

---

### Task 7: Ponta a ponta com a OpenRouter, calibragem inicial e documentação

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `DEVLOG.md`, `.env.example`

- [ ] **Step 1: Embedding real.** Com o build (`pnpm build && pnpm start -p 3005` se o `next dev` estiver sem as variáveis) e a conta de teste admin: responder 5 perguntas mapeadas com respostas no jeito da Ana (texto de teste), perguntar ao assistente paráfrases dessas perguntas e uma fora do assunto. Registrar as similaridades medidas (consulta direta no psql) e se as faixas 0,9 / 0,7 / 0,6 separam bem. Se o modelo de embedding for recusado pela conta, parar e avisar o dono antes de trocar de modelo.
- [ ] **Step 2:** Conferir que a conversa apareceu como **um** item em Pendentes, com as perguntas em ordem, e que a ligação "Parecida com" aparece nas paráfrases.
- [ ] **Step 3: Limpar:** apagar as linhas de teste (`treinamento` com origem `admin`/`aluna`, as conversas, as respostas dadas às mapeadas voltando para `pendente` com `resposta = null`, `embedding = null`), a linha em `admins` e o usuário de teste.
- [ ] **Step 4: Docs.** README: tabelas novas na tabela do banco, `OPENROUTER_EMBEDDING_MODEL` nas variáveis, seção "Treinamento da IA" (como virar admin pelo SQL `insert into public.admins (user_id) values ('…')`, os três limiares, o que a expert vê). CLAUDE.md: admin (`admin()`, tabela, só painel do Supabase), RAG no assistente (bloco da expert no fim, limiares em `treinamento.ts`, embedding acoplado à coluna de 1536) e o novo conjunto `ADMIN` do `protecao.test.ts`. DEVLOG: entrada 2026-11-09 com o pedido, as decisões da spec e as medições do Step 1. `.env.example`: `OPENROUTER_EMBEDDING_MODEL=`.
- [ ] **Step 5:** `pnpm test && pnpm lint && pnpm build` limpos, sem avisos. **Commit** `docs: treinamento da IA no README, CLAUDE.md e DEVLOG`
