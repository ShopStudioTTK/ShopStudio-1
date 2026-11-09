# Treinamento da IA (RAG com as respostas da expert) — design

Data: 2026-11-09 · Branch: `feat/treinamento-ia`

## Por quê

As respostas do assistente ainda não soam como a especialista (Ana). O preset da OpenRouter e o
`ai_config` descrevem a voz em instruções, mas descrição não basta: o modelo cria bordões, perde
gírias e erra o tamanho (ver DEVLOG 2026-11-05 e 2026-11-06). Respostas reais dela a perguntas
reais são o melhor modelo de tom. A ideia vem do `../whatsappBot` (FAQ semântico + fila de
Treinamento): a expert responde perguntas do jeito dela, e cada pergunta nova de aluna recebe as
respostas dela mais parecidas como exemplo, para sair com o mesmo tom, frases e gírias.

## Objetivos

1. **Papel de admin**, só para a página de Treinamento: tabela `admins`, editada no painel do Supabase.
2. **Página de Treinamento** (`/app/treinamento`), só para admin, com uma fila de perguntas de três origens:
   - **mapeada**: ~25 perguntas que nós montamos a partir das aulas, do dossiê e dos capítulos (seed por migration);
   - **aluna**: as perguntas reais feitas ao assistente, com a resposta que a IA deu;
   - **admin**: botão "Nova pergunta" para criar pergunta + resposta na hora.
3. **RAG no assistente:** embedding da pergunta da aluna → as respostas da expert mais parecidas entram no
   prompt como exemplo de tom e conteúdo. **A resposta sempre passa pela IA** (nunca devolve a da expert
   palavra por palavra).
4. **Verificação no servidor que não dá para burlar:** a tela não decide nada; toda rota de treinamento
   confere no banco, a cada chamada, que o token é válido e o `user_id` dele está em `admins`.

## Fora do escopo (não fazer)

- Gerador de roteiros: não usa os exemplos (o roteiro é na voz da aluna, não da Ana — DEVLOG 2026-11-06).
- Resposta verbatim por limiar alto (o whatsappBot faz ≥ 0,85). Fica para depois, se pedirem.
- Gerenciar admins pela tela. Quem é admin muda só no painel do Supabase.
- Trocar o modelo de embedding / script de re-embed. Vira pendência documentada.
- Mostrar quem fez a pergunta (nome, e-mail, `user_id`). A expert vê só o texto.

## Anti-objetivos (falharia mesmo "funcionando")

- Uma aluna conseguir ler ou alterar o treinamento (o texto vai no prompt de **todas**).
- Quebrar o cache de prompt: nada variável antes do `BASE_PROMPT`.
- Assistente cair porque o embedding falhou: sem exemplos, ele responde como hoje.
- Vazar quem perguntou o quê.

## Restrições do projeto (do CLAUDE.md)

Migration nova com RLS ligado e **sem** políticas/grants para `anon`/`authenticated`; `pnpm supabase
migration up` + `pnpm db:types`. Tudo em pt-BR. Segredos só em `server-only`. Teste antes da mudança;
`protecao.test.ts` acha toda rota sozinho. OpenRouter sempre pelo servidor. `pnpm test && pnpm lint &&
pnpm build` limpos no fim.

## Como funciona

### Banco (uma migration: `AAAAMMDDHHMMSS_treinamento.sql`)

```sql
create extension if not exists vector with schema extensions;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table public.treinamento (
  id uuid primary key default gen_random_uuid(),
  origem text not null check (origem in ('mapeada','aluna','admin')),
  status text not null default 'pendente' check (status in ('pendente','respondida','descartada')),
  pergunta text not null check (length(pergunta) between 1 and 1000),
  resposta_ia text,                       -- só origem 'aluna': o que a IA respondeu
  resposta text check (length(resposta) <= 4000),  -- a da expert; obrigatória quando 'respondida'
  embedding extensions.vector(1536),      -- da pergunta; null = ainda não indexada
  criado_em timestamptz not null default now(),
  respondido_por uuid references auth.users(id) on delete set null,
  respondido_em timestamptz,
  check (status <> 'respondida' or resposta is not null)
);
create index on public.treinamento (status, criado_em desc);
-- RLS ligado, sem políticas, revoke all from anon, authenticated (nas duas tabelas)
-- + insert das ~25 perguntas 'mapeada' (sem embedding)
```

`treinamento` **não tem `user_id`** de aluna, de propósito. Sem índice vetorial: são centenas de linhas
(`ponytail:` busca sequencial; HNSW se passar de alguns milhares).

### Admin: `admin()` em `src/lib/api-auth.ts`

`autenticar()` + `select 1 from public.admins where user_id = ${userId}` a cada chamada, sem cache. Não
admin → 403 "Acesso restrito à administração." Falha do banco → 500 (nunca libera). `GET /api/acesso`
devolve `admin: true` só para admin (o campo some para as outras, como o `trocarSenha`) — serve só para o
menu mostrar "Treinamento"; quem bloqueia é o servidor. A página `/app/treinamento` mostra "acesso
restrito" se a rota der 403.

### Rotas (`src/app/api/treinamento/route.ts`, todas com `admin()`)

| Método | O que faz |
|---|---|
| `GET ?status=pendente\|respondida\|descartada` | lista (id, origem, status, pergunta, resposta_ia, resposta, indexada, criado_em, respondido_em). Nunca o embedding nem `respondido_por` de outro. |
| `POST {pergunta, resposta}` | "Nova pergunta" (origem `admin`), já respondida: gera o embedding e grava. |
| `PATCH {id, resposta?, pergunta?, status?}` | responder / editar / aprovar a da IA (o front manda `resposta = resposta_ia`) / descartar / voltar para pendente. Ao responder, gera o embedding da pergunta e grava `respondido_por = userId do token`, `respondido_em = now()`. |
| `DELETE {id}` | apaga. |

Validação no servidor com `texto()` de `src/lib/entrada.ts` (pergunta ≤ 1000, resposta ≤ 4000), id em
formato uuid, `status` só dos três valores. **Embedding falhou** ao salvar: grava a resposta com
`embedding = null` e devolve `indexada: false`; a tela mostra "não indexada — salvar de novo". Pergunta
editada → embedding refeito.

### Embedding: `src/lib/embedding.ts` (`server-only`)

`POST https://openrouter.ai/api/v1/embeddings`, modelo em `OPENROUTER_EMBEDDING_MODEL` (padrão
`openai/text-embedding-3-small`, 1536 dimensões — acoplado à coluna), `AbortSignal.timeout(5000)`.
Devolve `number[]` ou lança. Confirmar no primeiro teste real que a conta (bloqueio de provedores que
treinam com os dados) aceita o modelo; se não, escolher outro de 1536 dimensões ou mudar a coluna antes
de aplicar a migration.

### Assistente (`/api/assistente`)

1. Depois de reservar a chamada, em paralelo com `configDaIA()`: embedding da **última** mensagem da aluna
   → `select pergunta, resposta, 1 - (embedding <=> $v) as similaridade from public.treinamento where
   status = 'respondida' and embedding is not null order by embedding <=> $v limit 4`, filtrando
   `similaridade >= LIMIAR_EXEMPLO` (começar em **0,5**, calibrar com número como no whatsappBot e no
   `videos_cache`; constante em `src/lib/treinamento.ts`). Qualquer falha → `[]` e segue (log no console).
2. `buildAssistantSystemPrompt` ganha um parâmetro `exemplos` e acrescenta, **no fim** (depois de persona,
   base e capítulo), um bloco:
   "RESPOSTAS DA ESPECIALISTA A PERGUNTAS PARECIDAS — imite o tom, as gírias, o jeito de falar e o tamanho.
   Use o conteúdo quando for a mesma dúvida; as regras de conteúdo acima continuam valendo e a citação
   (Aula N, m:ss) continua obrigatória quando a informação vier da transcrição." + pares P/R.
   Com o preset ligado, o bloco entra igual (complementa a voz do preset).
3. **Fila:** no fim do stream (`comRegistroDeUso`, que passa a juntar também o texto dos `delta.content`),
   grava uma linha `origem = 'aluna'`, `status = 'pendente'`, `pergunta` = última mensagem,
   `resposta_ia` = texto gerado, `embedding` = o vetor já calculado no passo 1 (se houver). Sem `user_id`.
   Falha ao gravar não afeta a aluna (só log). Resposta cortada/vazia não entra.

### Tela (`/app/treinamento`, `src/app/app/treinamento/page.tsx`)

- Item "Treinamento" no menu (`app-shell.tsx`, grupo próprio "Admin") só com `admin: true`.
- Abas: **Pendentes** · **Respondidas** · **Descartadas**, com contagem; filtro por origem (chips).
- Cartão: pergunta, selo da origem; se `aluna`, a resposta da IA em destaque menor ("o que a IA respondeu").
  Ações: **Responder** (textarea, salvar), **Aprovar a da IA** (só `aluna`), **Descartar**; nas
  respondidas: editar, voltar para pendente, apagar.
- Botão **"Nova pergunta"** (`variant="pop"`): pergunta + resposta, salva já respondida.
- Visual 2.0 (tokens de `globals.css`, `.chip`, `shadow-soft`), sem cores fixas. Dados por `api()` + React Query.

### Testes (antes do código)

- `protecao.test.ts`: conjunto `ADMIN` — sem token 401, aluna com acesso mas fora de `admins` → **403** e
  nenhuma consulta em `public.treinamento`.
- `tests/app/api/treinamento/`: validações (tamanho, status, uuid), `respondido_por` vem do token e nunca do
  corpo, embedding falho grava com `indexada: false`.
- `tests/app/api/assistente/`: exemplos entram **depois** do `BASE_PROMPT` (prefixo idêntico com e sem
  exemplos); embedding falho → assistente responde sem exemplos; a linha da fila não leva `user_id`.
- `tests/lib/uso.test.ts`: texto juntado dos deltas. `tests/lib/embedding.test.ts` com `fetch` falso.
- `acesso GET`: `admin` só aparece para admin.
- Migration: teste de config/SQL que confere RLS ligado e nenhum grant para `anon`/`authenticated` nas
  tabelas novas, se o padrão do repositório tiver um (senão, conferir no banco local).

### Perguntas mapeadas

~25, cobrindo os assuntos com mais peso nas aulas, no dossiê e nas dúvidas reais esperadas: ativar a conta
de afiliada, 2 mil seguidores, quantos vídeos por dia, gancho, nichar, produto campeão, amostra grátis ×
reembolsável, link no vídeo, comissão, música/som, vergonha de aparecer, sem resultado depois de X dias,
compra de seguidores, menor de idade, conta antiga, live, anúncio, níveis, comparação com outras,
desistir. Entram direto pelo seed; o que não servir, a expert descarta ou edita na tela.

## Decisões minhas (para conferir)

- Resposta sempre pela IA (sem verbatim): conversa com várias mensagens, citação e intenção parecida mas
  diferente (0,786 no whatsappBot).
- `LIMIAR_EXEMPLO` 0,5 e até 4 exemplos, a calibrar com medições.
- A fila das alunas guarda toda pergunta do assistente (inclusive "e quanto tempo?" sem contexto); a
  expert descarta. Sem deduplicação por enquanto (`ponytail:`; agrupar por similaridade se a fila encher).
- Menu "Treinamento" num grupo "Admin" no menu lateral; fora da barra inferior do celular.
- Modelo de embedding `openai/text-embedding-3-small` (o do whatsappBot, medido lá).
- Sem cache do `admin()`: um `select` por chave primária por chamada.
- Na fila, a pergunta da aluna é cortada em 1000 caracteres (o assistente aceita até 4000).
- Sem `OPENROUTER_API_KEY`, as rotas de treinamento continuam salvando, com `indexada: false`.
- O custo do embedding não é gravado em `ai_perguntas` (centésimos de centavo por pergunta).
- Admin passa pelo `autenticar()` também (senha trocada + acesso), além da tabela `admins`.

## Fica para quem constrói

Layout fino da tela, textos de interface, nome exato dos arquivos de componente, a forma de juntar os
deltas no `comRegistroDeUso` e a calibragem do limiar (com 6 a 10 perguntas reais, registrar no DEVLOG).
No fim, atualizar README (tabelas, variáveis, rotas), CLAUDE.md (admin, RAG) e DEVLOG.
