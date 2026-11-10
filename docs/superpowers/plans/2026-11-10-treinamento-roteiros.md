# Treinamento de roteiros (fichas da expert) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a expert registra fichas de roteiro (gatilho, porquê, entonação por parte do 5×5); o gerador usa as parecidas como modelo e mostra dois cartões embaixo do roteiro.

**Architecture:** duas tabelas novas (`gatilhos`, `fichas_roteiro` com pgvector 1536), escritas só por rotas com `admin()`. `src/lib/fichas.ts` (server-only) busca por embedding do produto e por formato + gatilho e monta o bloco do prompt. `/api/roteiro` busca as fichas em paralelo com a config, acrescenta `gatilho` e `fichas` à resposta. Tela: aba "Roteiros" no treinamento e os dois cartões no gerador.

**Tech Stack:** Next.js 16 (App Router), Postgres via `db()` (postgres.js), pgvector, OpenRouter (embedding `openai/text-embedding-3-small`), React Query, Tailwind 3, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-treinamento-roteiros-design.md`

## Global Constraints

- Ramo `feat/treinamento-roteiros` (em cima de `feat/minha-conta`). Commits pequenos, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Textos de interface, erros, comentários e commits em português do Brasil. Produto sempre "Shop Studio"; a expert aparece na tela como "a Ana".
- Limiares: **cartão 1 ≥ 0,6**; **prompt do gerador ≥ 0,7**; **no máximo 3 fichas por cartão**.
- Gatilhos iniciais (slug → rótulo): `curiosidade` → Curiosidade · `fofoca` → Fofoca · `choque` → Choque (quebra de padrão) · `problema` → Problema · `transformacao` → Transformação · `prova-social` → Prova social.
- Embedding da ficha = **só produto e tipo**: `` `${produto} — ${tipo}` ``. Na busca, o texto é o produto da aluna.
- Formato da ficha: um dos ids de `FORMATOS` (`src/content/formatos.ts`), conferido com `ehFormato`.
- Tabelas novas: RLS ligado, **sem** políticas nem grants para `anon`/`authenticated`. Escrita só por rotas que começam com `admin()` (antes de ler o corpo).
- Cache: `SYSTEM_PROMPT + DOSSIE_BLOCK` continua sendo o prefixo; lista de gatilhos e fichas entram **depois** do dossiê, antes do `FORMATO_FINAL`.
- O roteiro da aluna nunca explica as escolhas; o porquê só aparece nos cartões.
- Antes de cada commit: `pnpm test` limpo; no fim do plano, `pnpm test && pnpm lint && pnpm build` sem avisos.

## Review Focus

1. A IA devolve o gatilho como rótulo ou com outra caixa ("Fofoca", "PROVA SOCIAL") → vira o slug; algo fora da lista → `""` e o cartão 2 não aparece. (teste na Task 2)
2. A aluna manda um `formato` fora de `FORMATOS` (o corpo é livre) → cartão 2 vazio, roteiro normal, sem erro. (teste na Task 4)
3. Embedding fora do ar ao salvar a ficha → a ficha salva com `indexada: false` e não entra no cartão 1; ao editar, o embedding é refeito. Fora do ar no roteiro → roteiro sai com os cartões vazios (o cartão 2 ainda funciona, porque não usa embedding). (testes nas Tasks 3 e 4)
4. "+" com nome que vira um slug existente ("Fofóca") → 409, sem gatilho duplicado. (teste na Task 3)
5. Roteiro salvo antes desta mudança, ou salvo agora, reaberto pela biblioteca → sem `fichas`, a tela não quebra e não mostra cartão; o `fichas` não é gravado em `saved_scripts`. (Task 6)

---

### Task 1: Banco — gatilhos e fichas

**Files:**
- Create: `supabase/migrations/20261110030000_fichas_roteiro.sql`
- Modify: `src/integrations/supabase/types.ts` (gerado)

**Interfaces:**
- Produces: tabela `public.gatilhos (slug text pk, rotulo text, criado_em timestamptz)`; tabela `public.fichas_roteiro` com `id uuid pk`, `produto`, `tipo`, `formato`, `gancho`, `gancho_gatilho` (FK → `gatilhos.slug`, sem cascade), `gancho_porque`, `gancho_entonacao`, e `problema`, `solucao`, `cta` cada um com `_porque` e `_entonacao` (nullable), `embedding extensions.vector(1536)`, `criado_por uuid` (FK `auth.users`, `on delete set null`), `criado_em`, `atualizado_em`.

- [ ] **Step 1: Escrever a migration**

Checks no banco: `gatilhos.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`; `rotulo` 1–40; `produto` e `tipo` 1–120; `formato` 1–40; `gancho`, `problema`, `solucao`, `cta` 1–500; cada `_porque`/`_entonacao` ≤ 500; `gancho_porque` e `gancho_entonacao` not null. Insert dos 6 gatilhos da Global Constraints, nessa ordem (`criado_em` crescente). `alter table … enable row level security` nas duas, sem políticas. Comentário `-- ponytail: sem índice vetorial; HNSW se passar de alguns milhares de fichas`.

- [ ] **Step 2: Aplicar e regerar os tipos**

Run: `pnpm supabase migration up && pnpm db:types`
Expected: migration aplicada; `types.ts` com `fichas_roteiro` e `gatilhos`.

- [ ] **Step 3: Conferir no banco (com rollback)**

Run: `docker exec $(docker ps --format '{{.Names}}' | grep -m1 supabase_db) psql -U postgres -c "begin; select slug from public.gatilhos order by criado_em; insert into public.fichas_roteiro (produto,tipo,formato,gancho,gancho_gatilho,gancho_porque,gancho_entonacao,problema,solucao,cta) values ('a','b','Unboxing','g','nao-existe','p','e','x','y','z'); rollback;"`
Expected: os 6 slugs na ordem; o insert falha na FK de `gancho_gatilho`.

- [ ] **Step 4: Commit** — `feat(fichas): tabelas de gatilhos e fichas de roteiro`

---

### Task 2: `src/lib/fichas.ts` — busca, cartões e prompt

**Files:**
- Create: `src/lib/fichas-tipos.ts` (tipos compartilhados com a tela, sem `server-only`)
- Create: `src/lib/fichas.ts` (`import "server-only"`)
- Test: `tests/lib/fichas.test.ts`

**Interfaces:**
- Consumes: `db()`, `gerarEmbedding` (`src/lib/embedding.ts`), `vetorSql` (`src/lib/treinamento.ts`).
- Produces (`fichas-tipos.ts`):
  - `type Parte = { texto: string; porque: string | null; entonacao: string | null }`
  - `type Gatilho = { slug: string; rotulo: string }`
  - `type FichaCartao = { id: string; produto: string; tipo: string; formato: string; gatilho: Gatilho; gancho: Parte; problema: Parte; solucao: Parte; cta: Parte; similaridade?: number }`
  - `type FichasDoRoteiro = { parecidas: FichaCartao[]; mesmoJeito: FichaCartao[] }`
- Produces (`fichas.ts`):
  - `LIMIAR_CARTAO = 0.6`, `LIMIAR_MODELO = 0.7`, `MAX_CARTAO = 3`
  - `textoDaFicha(produto: string, tipo: string): string`
  - `listarGatilhos(): Promise<Gatilho[]>` (ordem `criado_em`)
  - `gatilhoDaIa(valor: unknown, gatilhos: Gatilho[]): string` → slug ou `""`
  - `buscarParecidas(produto: string): Promise<FichaCartao[]>` — nunca lança; até `MAX_CARTAO`, só `similaridade >= LIMIAR_CARTAO`, mais parecidas primeiro
  - `buscarDoMesmoJeito(formato: string, gatilho: string, excluir: string[]): Promise<FichaCartao[]>` — `[]` se `formato` não for `ehFormato` ou `gatilho` vazio; até `MAX_CARTAO`, mais novas primeiro, sem os ids de `excluir`
  - `blocoDasFichas(fichas: FichaCartao[], gatilhos: Gatilho[]): string` — lista de gatilhos (sempre) + fichas com `similaridade >= LIMIAR_MODELO`
  - `linhaParaCartao(l: Record<string, unknown>): FichaCartao` (usado também pela rota da Task 3)

- [ ] **Step 1: Escrever os testes que falham** (`tests/lib/fichas.test.ts`, com o db falso e `vi.mock("@/lib/embedding")`)

```ts
it("textoDaFicha usa só produto e tipo", () => {
  expect(textoDaFicha("Sérum Principia", "skincare")).toBe("Sérum Principia — skincare");
});
it.each([["fofoca", "fofoca"], ["Fofoca", "fofoca"], ["PROVA SOCIAL", "prova-social"], ["Prova social", "prova-social"], ["drama", ""], [null, ""]])(
  "gatilhoDaIa(%j) → %j", (v, esperado) => expect(gatilhoDaIa(v, GATILHOS)).toBe(esperado));
it("buscarParecidas: só ≥ 0,6, no máximo 3, embedding do produto da aluna", async () => {
  // db devolve 4 linhas com similaridade 0.95, 0.8, 0.61, 0.59
  expect((await buscarParecidas("sérum")).map((f) => f.similaridade)).toEqual([0.95, 0.8, 0.61]);
  expect(gerarEmbedding).toHaveBeenCalledWith("sérum");
});
it("buscarParecidas: embedding falhou → [] sem lançar", async () => { /* gerarEmbedding rejeita */ });
it("buscarDoMesmoJeito: formato fora da lista ou gatilho vazio → [] sem consultar o banco", async () => {
  expect(await buscarDoMesmoJeito("Dancinha", "fofoca", [])).toEqual([]);
  expect(await buscarDoMesmoJeito("Unboxing", "", [])).toEqual([]);
  expect(naTabela("fichas_roteiro")).toHaveLength(0);
});
it("buscarDoMesmoJeito: filtra formato + gatilho e exclui os ids do cartão 1", async () => {
  await buscarDoMesmoJeito("Unboxing", "fofoca", ["f1"]);
  expect(naTabela("fichas_roteiro")[0].valores).toEqual(expect.arrayContaining(["Unboxing", "fofoca"]));
  expect(naTabela("fichas_roteiro")[0].sql).toMatch(/limit/);
});
it("blocoDasFichas: lista os slugs dos gatilhos, só fichas ≥ 0,7, e manda não explicar", () => {
  const b = blocoDasFichas([ficha({ similaridade: 0.9 }), ficha({ id: "f2", produto: "Garrafa", similaridade: 0.65 })], GATILHOS);
  expect(b).toContain("prova-social");
  expect(b).toContain(ficha().gancho.porque!);
  expect(b).not.toContain("Garrafa");
  expect(b).toMatch(/não explique/i);
});
```

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test tests/lib/fichas.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar** `fichas-tipos.ts` e `fichas.ts` com as assinaturas acima. `gatilhoDaIa` compara pelo slug e pelo `slugDe(rótulo)` (`src/lib/entrada.ts`) do valor recebido, sem caixa. As consultas por embedding seguem `buscarRespostasDaExpert` (`1 - (embedding <=> ${v}::extensions.vector)`, `where embedding is not null`, `limit ${MAX_CARTAO}`) e filtram o limiar no código. Nenhuma consulta devolve `embedding` nem `criado_por`. O bloco começa por `GATILHOS (use no campo "gatilho" exatamente um destes slugs): …` e, havendo fichas ≥ 0,7, `ROTEIROS DA ESPECIALISTA PARA PRODUTOS PARECIDOS — pense como ela: o gatilho, o porquê de cada escolha, a entonação e a estrutura. Não explique as escolhas no roteiro; só escreva como ela escreveria.` seguido de cada ficha (produto, tipo, formato, e cada parte com texto, porquê e entonação).

- [ ] **Step 4: Rodar e ver passar** — `pnpm test tests/lib/fichas.test.ts` → PASS.

- [ ] **Step 5: Commit** — `feat(fichas): busca por produto e por formato + gatilho, bloco do prompt`

---

### Task 3: Rotas de admin — `/api/fichas` e `/api/gatilhos`

**Files:**
- Create: `src/app/api/fichas/route.ts`, `src/app/api/gatilhos/route.ts`
- Modify: `tests/app/api/protecao.test.ts` (conjunto `ADMIN` e a regex de tabelas)
- Test: `tests/app/api/fichas/route.test.ts`, `tests/app/api/gatilhos/route.test.ts`

**Interfaces:**
- Consumes: `admin()`, `texto`, `uuid`, `idDaUrl`, `slugDe` (`src/lib/entrada.ts`), `ehFormato`, `gerarEmbedding`, `vetorSql`, `textoDaFicha`, `linhaParaCartao`.
- Produces:
  - `GET /api/gatilhos` → `{ gatilhos: Gatilho[] }`; `POST { rotulo }` → `201 { gatilho }` | 400 | 409.
  - `GET /api/fichas` → `{ fichas: (FichaCartao & { indexada: boolean })[] }`, mais novas primeiro (`limit 200`, `ponytail:` sem paginação).
  - `POST` corpo `{ produto, tipo, formato, gatilho, gancho: Parte, problema: Parte, solucao: Parte, cta: Parte }` (Parte do navegador: `{ texto, porque, entonacao }`) → `201 { id, indexada }`.
  - `PATCH` mesmo corpo + `id` → `200 { id, indexada }`; 404 se não existe.
  - `DELETE ?id=` → 204 | 404.
  - Todas começam por `admin(req, "fichas")` / `admin(req, "gatilhos")`, antes de ler corpo ou URL.

- [ ] **Step 1: Testes que falham**

`gatilhos`: cria com slug de `slugDe` (`"Dor de cabeça"` → `dor-de-cabeca`); repetido (`on conflict do nothing` sem linha) → 409; rótulo vazio → 400.
`fichas`:
```ts
it("cria: embedding só de produto e tipo; criado_por do token", async () => {
  expect((await POST(req("POST", FICHA))).status).toBe(201);
  expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).input).toBe("Sérum — skincare");
  expect(naTabela("fichas_roteiro")[0].valores).toContain("u1");
});
it.each([{ formato: "Dancinha" }, { produto: "" }, { gancho: { texto: "g", porque: "", entonacao: "e" } }, { problema: { texto: "" } }])(
  "ficha inválida (%j) → 400 sem gravar", async (troca) => { /* … */ });
it("gatilho que não existe → 400 (FK do banco vira mensagem)", async () => { /* db rejeita com code 23503 */ });
it("embedding fora do ar → salva com indexada: false", async () => { /* fetch rejeita */ });
it("PATCH refaz o embedding e devolve 404 para id que não existe", async () => { /* … */ });
it("GET não devolve embedding nem criado_por", async () => { /* texto da resposta sem "embedding", "criado_por", "u9" */ });
```
`protecao.test.ts`: acrescentar `"fichas GET", "fichas POST", "fichas PATCH", "fichas DELETE", "gatilhos GET", "gatilhos POST"` ao `ADMIN` e `fichas_roteiro|gatilhos` à regex `/public\.(treinamento|campeoes|nichos)/`.

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test tests/app/api/fichas tests/app/api/gatilhos tests/app/api/protecao.test.ts` → FAIL.

- [ ] **Step 3: Implementar as duas rotas.** Tamanhos iguais aos checks da Task 1 (`texto(v, 120)` para produto/tipo, `texto(v, 500)` para as partes). Erro `23503` do Postgres no insert/update = `400 "Esse gatilho não existe."`. Embedding com o mesmo padrão de `vetorDe` da rota do treinamento (falha → `null`, loga). `PATCH` refaz o embedding sempre (texto pequeno, edição rara).

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS; `pnpm test` inteiro limpo.

- [ ] **Step 5: Commit** — `feat(fichas): rotas de fichas e gatilhos, só admin`

---

### Task 4: Gerador usa as fichas e devolve os cartões

**Files:**
- Modify: `src/lib/roteiro.ts` (schema do JSON, `ScriptResult`, `buildSystemPrompt`)
- Modify: `src/app/api/roteiro/route.ts`
- Test: `tests/lib/roteiro.test.ts`, `tests/app/api/roteiro/route.test.ts`

**Interfaces:**
- Consumes: `listarGatilhos`, `buscarParecidas`, `buscarDoMesmoJeito`, `blocoDasFichas`, `gatilhoDaIa` (Task 2); `FichasDoRoteiro`.
- Produces:
  - `ScriptResult` ganha `gatilho?: string` e `fichas?: FichasDoRoteiro`.
  - `buildSystemPrompt(config, knowledge, fichas: string = "")` — `fichas` é o texto de `blocoDasFichas`, inserido entre `knowledgeBlock` e `FORMATO_FINAL`.
  - `POST /api/roteiro` responde `{ ...roteiro, gatilho: string, fichas: FichasDoRoteiro }`.

- [ ] **Step 1: Testes que falham**

`roteiro.test.ts`:
```ts
it("o bloco das fichas vem depois do dossiê e antes do lembrete final", () => {
  const p = buildSystemPrompt(null, [], "BLOCO-FICHAS");
  expect(p.indexOf("BLOCO-FICHAS")).toBeGreaterThan(p.indexOf("DOSSIÊ DA ESPECIALISTA"));
  expect(p.indexOf("BLOCO-FICHAS")).toBeLessThan(p.lastIndexOf("Lembrete:"));
  expect(buildSystemPrompt(null, []).startsWith(SYSTEM_PROMPT)).toBe(true);
});
it("o JSON pede o campo gatilho", () => expect(SYSTEM_PROMPT).toContain('"gatilho"'));
```
`route.test.ts` (com `vi.mock("@/lib/fichas", …)` controlando as funções; a IA responde `gatilho: "Fofoca"`):
```ts
it("normaliza o gatilho e monta os dois cartões sem repetir fichas", async () => {
  buscarParecidas.mockResolvedValue([ficha({ id: "f1", similaridade: 0.8 })]);
  buscarDoMesmoJeito.mockResolvedValue([ficha({ id: "f2" })]);
  const json = await (await POST(req({ produto: "Sérum", formato: "Unboxing" }))).json();
  expect(json.gatilho).toBe("fofoca");
  expect(buscarDoMesmoJeito).toHaveBeenCalledWith("Unboxing", "fofoca", ["f1"]);
  expect(json.fichas).toEqual({ parecidas: [expect.objectContaining({ id: "f1" })], mesmoJeito: [expect.objectContaining({ id: "f2" })] });
});
it("o bloco das fichas vai no prompt de sistema", async () => { /* blocoDasFichas → "BLOCO"; corpo enviado à OpenRouter contém "BLOCO" no system */ });
it("formato fora da lista → mesmoJeito vazio, roteiro normal", async () => { /* formato "Dancinha" → status 200, fichas.mesmoJeito [] */ });
it("busca de fichas e de gatilhos falhando → roteiro sai igual, com cartões vazios", async () => { /* listarGatilhos rejeita; buscarParecidas → [] */ });
```
Os testes antigos de `route.test.ts` continuam passando (o mock de `@/lib/fichas` devolve vazio por padrão).

- [ ] **Step 2: Rodar e ver falhar** — `pnpm test tests/lib/roteiro.test.ts tests/app/api/roteiro` → FAIL.

- [ ] **Step 3: Implementar.** No schema do `SYSTEM_PROMPT`, depois de `"formatoSugerido"`: `"gatilho": "o gatilho do gancho escolhido, um dos slugs da lista GATILHOS"`. Na rota, depois da reserva: `Promise.all([configDaIA(), buscarParecidas(input.produto), listarGatilhos().catch(() => [])])`; depois do JSON: `gatilho = gatilhoDaIa(roteiro.gatilho, gatilhos)` e `mesmoJeito = await buscarDoMesmoJeito(input.formato, gatilho, parecidas.map((f) => f.id)).catch(() => [])`.

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS; `pnpm test` limpo.

- [ ] **Step 5: Commit** — `feat(roteiro): fichas da expert no prompt, campo gatilho e cartões na resposta`

---

### Task 5: Aba "Roteiros" no treinamento

**Files:**
- Create: `src/components/fichas-roteiro.tsx` (lista + formulário + "+" de gatilho)
- Modify: `src/app/app/treinamento/page.tsx` (alternância "Perguntas | Roteiros" acima das abas de status)

**Interfaces:**
- Consumes: `GET/POST/PATCH/DELETE /api/fichas`, `GET/POST /api/gatilhos` (Task 3); `FORMATOS`; tipos de `src/lib/fichas-tipos.ts`.
- Produces: `export const FichasRoteiro = () => JSX.Element` (default export não é preciso).

- [ ] **Step 1: Implementar a tela.** Alternância com `.chip`/`data-ativo`, guardada em `?secao=roteiros` (como `?aba=` em Roteiros; `useSearchParams` dentro do `<Suspense>` que a página já tem ou um novo). Lista em cartões: produto, tipo, formato, chip do gatilho, aviso "não indexada" quando `indexada` for false; botões editar e apagar (apagar pede confirmação em linha, sem `confirm()`). Formulário com: produto, tipo, formato (chips de `FORMATOS`), e um bloco por parte (Gancho, Problema, Solução, CTA) com texto, "Por quê" e "Entonação"; no Gancho, o seletor de gatilho com um botão "+" ao lado que abre um campo curto e chama `POST /api/gatilhos` (sucesso já seleciona o novo; 409 mostra a mensagem). Contadores nos campos de 500. React Query com chave `["fichas"]` e `["gatilhos"]`; `toast` para erros.

- [ ] **Step 2: Verificar** — `pnpm lint && pnpm build` → sem avisos.

- [ ] **Step 3: Commit** — `feat(fichas): aba Roteiros no treinamento, com "+" de gatilho`

---

### Task 6: Cartões embaixo do roteiro

**Files:**
- Create: `src/components/fichas-da-expert.tsx`
- Modify: `src/components/script-generator.tsx` (render depois da seção do roteiro; tirar `fichas` ao salvar)

**Interfaces:**
- Consumes: `FichaCartao`, `FichasDoRoteiro` (`src/lib/fichas-tipos.ts`); `ScriptResult` local do componente ganha `gatilho?: string; fichas?: FichasDoRoteiro`.
- Produces: `CartaoDaExpert({ titulo, subtitulo, fichas }: { titulo: string; subtitulo: string; fichas: FichaCartao[] })` — não renderiza nada com `fichas` vazio.

- [ ] **Step 1: Implementar.** Opção A do esboço: cartão escuro (tokens do tema, sem cor fixa), a primeira ficha aberta (produto, chip do gatilho, e por parte: texto, "Por quê", "Entonação" quando houver), as outras em linhas com a % (`Math.round(similaridade * 100)`, só no cartão 1) e "ver", que troca qual está aberta. Ordem no gerador: 5×5 → `CartaoDaExpert` "A Ana já fez roteiro de produtos parecidos" (`fichas.parecidas`) → `CartaoDaExpert` "A Ana já fez alguns roteiros desse jeito, ela estruturou assim" (`fichas.mesmoJeito`). Ao salvar (`POST /api/roteiros-salvos`), mandar `conteudo` sem `fichas` (`const { fichas, ...conteudo } = result`). Roteiro reaberto sem `fichas` não mostra cartão.

- [ ] **Step 2: Verificar** — `pnpm test && pnpm lint && pnpm build` → limpos.

- [ ] **Step 3: Commit** — `feat(roteiro): cartões das fichas da Ana embaixo do roteiro`

---

### Task 7: Ponta a ponta e documentação

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `DEVLOG.md`

- [ ] **Step 1: Ponta a ponta no navegador.** `pnpm build && WEBHOOK_CONTA_SEGREDO=<qualquer> pnpm start -p 3005`; conta de teste pelo webhook, troca da senha, `insert into public.admins`. Conferir: criar gatilho pelo "+" (e o 409 repetindo), criar 2 fichas (uma de sérum em "Conselho de amiga" + fofoca, outra de garrafa no mesmo formato + gatilho); gerar roteiro de "sérum de vitamina C" em "Conselho de amiga" e ver o cartão 1 com o sérum e, se a IA escolher fofoca, o cartão 2 com a garrafa e sem o sérum; salvar e reabrir pela biblioteca sem cartões; aluna sem `admins` recebe 403 em `/api/fichas`; console sem erro; largura de 390 px sem rolagem lateral. Apagar a conta de teste e as fichas de teste no fim.

- [ ] **Step 2: Documentar.** README: aba Roteiros no treinamento, os dois cartões, tabelas `gatilhos` e `fichas_roteiro` na tabela do banco, rotas na estrutura. CLAUDE.md: bullet "Fichas de roteiro" na Arquitetura (limiares 0,6/0,7, embedding só de produto + tipo, bloco depois do dossiê, `admin()` nas rotas, `fichas` fora do roteiro salvo). DEVLOG: entrada 2026-11-10 com pedido, decisões da dona, o que foi verificado e os limiares a calibrar.

- [ ] **Step 3: Verificação final** — `pnpm test && pnpm lint && pnpm build` → limpos, sem avisos.

- [ ] **Step 4: Commit** — `docs: treinamento de roteiros (fichas da expert)`
