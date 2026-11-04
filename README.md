# Shop Studio

Aplicativo web (Next.js 16 + Supabase) que ajuda vendedores da TikTok Shop a criar roteiros de vídeo com IA e acompanhar o progresso no curso.

## Requisitos

Node 20+, pnpm e Docker (para o Supabase local).

## Primeiros passos

```bash
pnpm install
cp .env.example .env.local
```

Variáveis do `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: URL e chave anon (públicas).
- `SUPABASE_SERVICE_ROLE_KEY`: chave service role (secreta, só servidor).
- `OPENROUTER_API_KEY`: chave do OpenRouter (secreta, só servidor).
- `OPENROUTER_MODEL`: qualquer id de modelo do OpenRouter (ex.: `anthropic/claude-sonnet-4.5`).

## Supabase local

```bash
pnpm db:start     # sobe o Supabase no Docker; preencha o .env.local com a saída de `pnpm supabase status`
pnpm db:reset     # recria o banco a partir das migrations
pnpm db:types     # regera src/integrations/supabase/types.ts
```

## Desenvolvimento

```bash
pnpm dev          # http://localhost:3000
pnpm test
pnpm build
```

## Produção

1. `pnpm supabase link --project-ref <ref>` e `pnpm supabase db push`.
2. No painel do Supabase, em Auth, configure a Site URL e as redirect URLs (inclua `/redefinir`).
3. Teste login e progresso (smoke test).

Para criar um código de acesso, no SQL editor:

```sql
insert into public.access_codes (code) values ('SHOPSTUDIO-XXXXXXXX');
```

## Modo revisão

`ACESSO_ABERTO_PARA_REVISAO` em `src/lib/access.ts` libera o app para qualquer conta criada, sem código.

> Atenção: antes de abrir ao público, troque essa chave para `false` e defina um limite de crédito na chave do OpenRouter.

## Material da IA (aulas e dossiê)

O assistente responde com base no resumo dos capítulos, na transcrição das aulas e no dossiê da especialista. O gerador de roteiros também usa o dossiê. Os dois documentos viram texto em `src/lib/conhecimento/material.ts`, que só roda no servidor e nunca vai para o navegador.

Quando a transcrição (PDF) ou o dossiê (DOCX) mudarem, gere o arquivo de novo (precisa do `pdftotext`, do pacote poppler-utils):

```bash
python3 -I scripts/gerar-conhecimento.py caminho/transcricao.pdf caminho/dossie.docx
```

O script remove capa, sumário e rodapés, ignora os vídeos de upsell e troca "Shop Club" por "Shop Studio".
