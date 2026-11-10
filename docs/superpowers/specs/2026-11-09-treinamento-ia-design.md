# Treinamento da IA (RAG com as respostas da expert) — design

Data: 2026-11-09 · Branch: `feat/treinamento-ia`

## Por quê

As respostas do assistente ainda não soam como a especialista (Ana). O preset da OpenRouter e o
`ai_config` descrevem a voz em instruções, mas descrição não basta: o modelo cria bordões, perde
gírias e erra o tamanho (ver DEVLOG 2026-11-05 e 2026-11-06). Respostas reais dela a perguntas
reais são o melhor modelo de tom. A ideia vem do `../whatsappBot` (FAQ semântico + fila de
Treinamento): a expert responde perguntas do jeito dela, e cada pergunta nova de aluna recebe as
respostas dela mais parecidas, para sair com o mesmo tom, frases e gírias.

## Objetivos

1. **Papel de admin**, só para a página de Treinamento: tabela `admins`, editada no painel do Supabase.
2. **Página de Treinamento** (`/app/treinamento`), só para admin, com perguntas de três origens:
   - **mapeada**: ~25 perguntas que nós montamos a partir das aulas, do dossiê e dos capítulos (seed por migration);
   - **aluna**: as conversas reais do assistente. **Cada conversa é um item só**, com o histórico (perguntas
     e respostas da IA em ordem), e a expert responde pergunta por pergunta;
   - **admin**: botão "Nova pergunta" para criar pergunta + resposta na hora.
3. **RAG no assistente**, com três faixas de semelhança entre a pergunta da aluna e as já respondidas pela expert:
   - **≥ 0,9**: a IA repete a resposta da expert praticamente palavra por palavra, no máximo ligando com a
     conversa ou acrescentando um detalhe;
   - **≥ 0,7**: as mais parecidas (até 4) entram como modelo de tom, gírias, jeito de falar e conteúdo;
   - abaixo disso: responde como hoje.
   A resposta **sempre passa pela IA** (stream, limite, custo e citação seguem iguais).
4. **Perguntas parecidas ligadas (≥ 0,6)** na tela: cada pergunta mostra a já respondida mais parecida, com a
   resposta, e a expert pode editar tanto a de referência quanto a nova.
5. **Embedding com contexto:** numa conversa, a pergunta solta ("e quanto tempo demora?") é indexada junto
   com as perguntas anteriores, para o vetor saber do que ela fala.
6. **Verificação no servidor que não dá para burlar:** a tela não decide nada; toda rota de treinamento
   confere no banco, a cada chamada, que o token é válido e o `user_id` dele está em `admins`.

## Fora do escopo (não fazer)

- Gerador de roteiros: não usa as respostas da expert (o roteiro é na voz da aluna — DEVLOG 2026-11-06).
- Devolver a resposta da expert sem passar pela IA.
- Gerenciar admins pela tela. Quem é admin muda só no painel do Supabase.
- Trocar o modelo de embedding / script de re-embed. Vira pendência documentada.
- Mostrar quem fez a pergunta (nome, e-mail, `user_id`). A expert vê só o texto.

## Anti-objetivos (falharia mesmo "funcionando")

- Uma aluna conseguir ler ou alterar o treinamento (o texto vai no prompt de **todas**).
- Uma aluna conseguir pendurar perguntas na conversa de outra.
- Quebrar o cache de prompt: nada variável antes do `BASE_PROMPT`.
- Assistente cair porque o embedding falhou: sem exemplos, ele responde como hoje.
- Vazar quem perguntou o quê.

## Restrições do projeto (do CLAUDE.md)

Migration nova com RLS ligado e **sem** políticas/grants para `anon`/`authenticated`; `pnpm supabase
migration up` + `pnpm db:types`. Tudo em pt-BR. Segredos só em `server-only`. Teste antes da mudança;
`protecao.test.ts` acha toda rota sozinho. OpenRouter sempre pelo servidor. `pnpm test && pnpm lint &&
pnpm build` limpos no fim.

## Como funciona

### Limiares (`src/lib/treinamento.ts`, constantes)

| Constante | Valor | Uso |
|---|---|---|
| `LIMIAR_QUASE_IGUAL` | 0,9 | repetir a resposta da expert quase palavra por palavra |
| `LIMIAR_EXEMPLO` | 0,7 | entra no prompt como modelo |
| `LIMIAR_PARECIDA` | 0,6 | ligação na tela de treinamento |

Valores de partida (pedidos pelo dono). Calibrar com medições reais depois (como no whatsappBot e no
`videos_cache`) e registrar no DEVLOG; o limiar depende do modelo de embedding.

### Banco (uma migration: `AAAAMMDDHHMMSS_treinamento.sql`)

```sql
create extension if not exists vector with schema extensions;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Uma conversa do assistente = um item na fila. O user_id existe só para o servidor
-- pendurar a pergunta certa na conversa certa; NUNCA sai nas rotas de admin.
create table public.treinamento_conversas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  conversa_cliente uuid not null,         -- id gerado pelo navegador a cada "Nova conversa"
  criado_em timestamptz not null default now(),
  unique (user_id, conversa_cliente)
);

create table public.treinamento (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('mapeada','aluna','admin')),
  status text not null default 'pendente' check (status in ('pendente','respondida','descartada')),
  conversa_id uuid references public.treinamento_conversas(id) on delete set null,  -- só 'aluna'
  ordem int,                              -- posição na conversa (só 'aluna')
  contexto text,                          -- perguntas anteriores da conversa usadas no embedding
  pergunta text not null check (length(pergunta) between 1 and 1000),
  resposta_ia text,                       -- só 'aluna': o que a IA respondeu
  resposta text check (length(resposta) <= 4000),  -- a da expert; obrigatória quando 'respondida'
  embedding extensions.vector(1536),      -- de contexto + pergunta; null = ainda não indexada
  criado_em timestamptz not null default now(),
  respondido_por uuid references auth.users(id) on delete set null,
  respondido_em timestamptz,
  check (status <> 'respondida' or resposta is not null)
);
create index on public.treinamento (status, criado_em desc);
create index on public.treinamento (conversa_id, ordem);
-- RLS ligado, sem políticas, revoke all from anon, authenticated (nas três tabelas)
-- + insert das ~25 perguntas 'mapeada' (sem embedding)
```

`treinamento` não tem `user_id` de aluna. Apagar a conta da aluna não apaga o que a expert respondeu (só
solta a ligação). Sem índice vetorial: são centenas de linhas (`ponytail:` busca sequencial; HNSW se
passar de alguns milhares).

### Embedding com contexto: `src/lib/embedding.ts` (`server-only`)

- `POST https://openrouter.ai/api/v1/embeddings`, modelo em `OPENROUTER_EMBEDDING_MODEL` (padrão
  `openai/text-embedding-3-small`, 1536 dimensões — acoplado à coluna), `AbortSignal.timeout(5000)`.
  Devolve `number[]` ou lança. Confirmar no primeiro teste real que a conta (bloqueio de provedores que
  treinam com os dados) aceita o modelo; se não, escolher outro antes de aplicar a migration.
- **Texto indexado = até 2 perguntas anteriores da mesma conversa + a pergunta** (`textoParaEmbedding(contexto,
  pergunta)`, função pura, testada). O **mesmo** formato vale dos dois lados: ao indexar a linha da fila e ao
  buscar para a aluna (com as 2 mensagens anteriores dela na conversa). Perguntas mapeadas e de admin não têm
  contexto. `ponytail:` contexto = perguntas anteriores cruas; se a busca piorar, a expert reescreve a pergunta
  sozinha ao responder (a pergunta é editável e o embedding é refeito).

### Admin: `admin()` em `src/lib/api-auth.ts`

`autenticar()` + `select 1 from public.admins where user_id = ${userId}` a cada chamada, sem cache. Não
admin → 403 "Acesso restrito à administração." Falha do banco → 500 (nunca libera). `GET /api/acesso`
devolve `admin: true` só para admin (o campo some para as outras, como o `trocarSenha`) — serve só para o
menu mostrar "Treinamento"; quem bloqueia é o servidor. A página `/app/treinamento` mostra "acesso
restrito" se a rota der 403.

### Rotas (`src/app/api/treinamento/route.ts`, todas com `admin()`)

| Método | O que faz |
|---|---|
| `GET ?status=pendente\|respondida\|descartada` | Itens da aba: perguntas soltas (mapeada/admin) e **conversas** (as linhas `aluna` agrupadas por `conversa_id`, em `ordem`, com `resposta_ia`). Uma conversa aparece em "Pendentes" enquanto tiver alguma pergunta pendente. Cada pergunta traz `parecida`: a respondida mais parecida (≥ `LIMIAR_PARECIDA`, excluindo ela mesma) com id, pergunta, resposta e semelhança — calculada na leitura (`lateral join`), então fica sempre atual. Nunca devolve embedding, `user_id` nem `respondido_por`. |
| `POST {pergunta, resposta}` | "Nova pergunta" (origem `admin`), já respondida: gera o embedding e grava. |
| `PATCH {id, resposta?, pergunta?, status?}` | responder / editar / aprovar a da IA (o front manda `resposta = resposta_ia`) / descartar / voltar para pendente. Serve também para editar a pergunta **de referência** a partir da ligação. Ao responder, grava `respondido_por = userId do token`, `respondido_em = now()`. Pergunta editada → embedding refeito. |
| `DELETE {id}` | apaga uma pergunta. |

Validação no servidor com `texto()` de `src/lib/entrada.ts` (pergunta ≤ 1000, resposta ≤ 4000), id em
formato uuid, `status` só dos três valores. **Embedding falhou** ao salvar: grava com `embedding = null` e
devolve `indexada: false`; a tela mostra "não indexada — salvar de novo". Sem `OPENROUTER_API_KEY`, idem.

### Assistente (`/api/assistente`)

1. **Conversa:** o navegador manda `conversa` (uuid gerado em `use-ai-chat` a cada "Nova conversa"). O
   servidor valida o formato e usa sempre o par `(user_id do token, conversa)`: uma aluna nunca acha nem
   escreve na conversa de outra. Sem `conversa` válido, a fila é pulada (o assistente responde igual).
2. Depois de reservar a chamada, em paralelo com `configDaIA()`: embedding de `textoParaEmbedding(2 perguntas
   anteriores, última)` → busca as 4 respondidas mais parecidas (`status = 'respondida' and embedding is not
   null`, `1 - (embedding <=> $v)`). Qualquer falha → nada e segue (log no console).
3. `buildAssistantSystemPrompt` ganha o parâmetro `expert` e acrescenta, **no fim** (depois de persona, base e
   capítulo):
   - se a melhor ≥ `LIMIAR_QUASE_IGUAL`: "A ESPECIALISTA JÁ RESPONDEU ESTA PERGUNTA. Responda com a resposta
     dela, praticamente palavra por palavra. Só pode ligar com o que a aluna disse na conversa ou acrescentar um
     detalhe curto do material, sem contrariar a resposta." + o par;
   - senão, as ≥ `LIMIAR_EXEMPLO`: "RESPOSTAS DA ESPECIALISTA A PERGUNTAS PARECIDAS — imite o tom, as gírias, o
     jeito de falar e o tamanho. Use o conteúdo quando for a mesma dúvida; as regras de conteúdo acima continuam
     valendo." + pares P/R.
   A citação "(Aula N, m:ss)" segue obrigatória quando a informação vier da transcrição. Com o preset ligado, o
   bloco entra igual. As respostas da expert são texto de admin no prompt de sistema: o tamanho é limitado na
   gravação.
4. **Fila:** no fim do stream (`comRegistroDeUso`, que passa a juntar também o texto dos `delta.content`):
   cria a conversa se não existir (`insert … on conflict (user_id, conversa_cliente) do nothing`) e grava a
   linha `origem = 'aluna'`, `status = 'pendente'`, `ordem` = próxima, `contexto` = as perguntas anteriores,
   `pergunta` = última mensagem (cortada em 1000), `resposta_ia` = texto gerado, `embedding` = o vetor do passo
   2. Falha não afeta a aluna (só log). Resposta vazia ou cortada (`finish_reason: "length"`) não entra.

### Tela (`/app/treinamento`, `src/app/app/treinamento/page.tsx`)

- Item "Treinamento" no menu lateral (`app-shell.tsx`, grupo próprio "Admin") só com `admin: true`.
- Abas: **Pendentes** · **Respondidas** · **Descartadas**, com contagem; filtro por origem (chips).
- **Conversa de aluna** = um cartão com o histórico em ordem: cada pergunta, a resposta da IA ("o que a IA
  respondeu", menor) e, por pergunta, as ações **Responder** (textarea), **Aprovar a da IA**, **Descartar**.
- **Pergunta solta** (mapeada/admin) = cartão com a pergunta e as mesmas ações (sem "Aprovar a da IA").
- **Parecida:** quando houver, embaixo da pergunta: "Parecida com: …" (semelhança em %), que abre a pergunta
  de referência com a resposta dela, editável ali mesmo. Dá para editar a de referência e a nova sem sair da tela.
- Nas respondidas: editar, voltar para pendente, apagar.
- Botão **"Nova pergunta"** (`variant="pop"`): pergunta + resposta, salva já respondida.
- Visual 2.0 (tokens de `globals.css`, `.chip`, `shadow-soft`), sem cores fixas. Dados por `api()` + React Query.

### Testes (antes do código)

- `protecao.test.ts`: conjunto `ADMIN` — sem token 401, aluna com acesso mas fora de `admins` → **403** e
  nenhuma consulta em `public.treinamento*`.
- `tests/app/api/treinamento/`: validações (tamanho, status, uuid), `respondido_por` vem do token e nunca do
  corpo, embedding falho grava com `indexada: false`, resposta do GET sem `user_id`/embedding, conversa
  agrupada em ordem, `parecida` só ≥ 0,6 e nunca ela mesma.
- `tests/app/api/assistente/`: prefixo do system prompt idêntico com e sem bloco da expert; ≥ 0,9 gera o bloco
  "quase igual", 0,7–0,9 o de exemplos, < 0,7 nada; embedding falho → responde sem bloco; a conversa é
  procurada pelo `user_id` do token (em `isolamento.test.ts`); `conversa` inválido → sem fila.
- `tests/lib/treinamento.test.ts`: `textoParaEmbedding` (sem contexto, com 1, corta em 2).
- `tests/lib/uso.test.ts`: texto juntado dos deltas. `tests/lib/embedding.test.ts` com `fetch` falso.
- `acesso GET`: `admin` só aparece para admin.
- Migration: conferir no banco local RLS ligado e nenhum grant para `anon`/`authenticated` nas tabelas novas.

### Perguntas mapeadas

~25, cobrindo os assuntos com mais peso nas aulas, no dossiê e nas dúvidas reais esperadas: ativar a conta
de afiliada, 2 mil seguidores, quantos vídeos por dia, gancho, nichar, produto campeão, amostra grátis ×
reembolsável, link no vídeo, comissão, música/som, vergonha de aparecer, sem resultado depois de X dias,
compra de seguidores, menor de idade, conta antiga, live, anúncio, níveis, comparação com outras,
desistir. Entram direto pelo seed; o que não servir, a expert descarta ou edita na tela.

## Decisões minhas (para conferir)

- "Quase palavra por palavra" (≥ 0,9) é uma instrução forte à IA, não a resposta devolvida crua: assim o
  stream, o limite, o custo e a ligação com a conversa ficam iguais.
- Contexto do embedding = as 2 perguntas anteriores da conversa, nos dois lados (indexar e buscar).
- A conversa é identificada por um id que o navegador gera a cada "Nova conversa", sempre junto com o
  `user_id` do token.
- Uma conversa fica em "Pendentes" enquanto tiver pergunta pendente; as respondidas dela aparecem também
  em "Respondidas" como perguntas soltas (com o contexto visível).
- "Parecida" é calculada na leitura (sempre atual), não gravada.
- Até 4 exemplos no prompt. Sem deduplicação na fila por enquanto (a ligação ≥ 0,6 já mostra as repetidas).
- Menu "Treinamento" num grupo "Admin" no menu lateral; fora da barra inferior do celular.
- Modelo de embedding `openai/text-embedding-3-small` (o do whatsappBot, medido lá).
- Sem cache do `admin()`: um `select` por chave primária por chamada. Admin passa pelo `autenticar()` também.
- O custo do embedding não é gravado em `ai_perguntas` (centésimos de centavo por pergunta).

## Fica para quem constrói

Layout fino da tela, textos de interface, nome exato dos arquivos de componente, a forma de juntar os
deltas no `comRegistroDeUso`, e a calibragem dos limiares com perguntas reais (registrar no DEVLOG). No
fim, atualizar README (tabelas, variáveis, rotas), CLAUDE.md (admin, RAG, limiares) e DEVLOG.
