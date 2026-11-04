# Shop Studio: migração do Shop Club (Enter/Vite) para Next.js + Supabase próprio

Data: 2026-11-04
Origem: `../ShopStudio` (projeto gerado no Enter.pro, Vite + React + Enter Cloud)
Destino: `ShopStudioTTK/` (pasta irmã, repositório git próprio)

## Intenção

O Shop Club é um guia de TikTok Shop em formato de app: área de membros com 12 capítulos, gerador de roteiros 5×5 com IA, assistente, checklist, resultados, campeões e desafio. Ele foi feito no Enter.pro, um construtor de apps por IA, e depende do Enter para tudo que fica por baixo: banco e login (Supabase gerenciado pelo Enter), gateway de IA, analytics e plugin de build.

A dona quer o produto **inteiramente sob o controle dela**, sem resquícios do Enter, para continuar evoluindo internamente. Ao mesmo tempo, o produto passa a se chamar **Shop Studio**. Nada foi usado por pessoas reais (só testes no Enter), então não existe dado para migrar.

## Objetivos

1. Um projeto Next.js (App Router, TypeScript, pnpm) em `ShopStudioTTK/` que reproduz as telas e o visual atuais.
2. Um projeto Supabase próprio (login por e-mail/senha, banco, storage) criado do zero com a estrutura atual consolidada numa migração inicial.
3. Gerador de roteiros chamando a **OpenRouter** a partir de uma rota de servidor do Next, com o modelo configurável por variável de ambiente.
4. Nome trocado de "Shop Club" para "Shop Studio" em todo lugar visível e interno.
5. Nenhuma referência ao Enter no repositório novo.

## Fora do escopo (agora)

- **Assistente de IA funcionando.** A tela `/app/assistente` é portada, mas sem backend: não chama IA nenhuma. Ela mostra a interface com um aviso discreto de que está em breve. A dona liga depois.
- **Dona/administração.** Sai toda a lógica de "primeira conta reivindica o app e vira dona" (`ai_config.owner_id`, `isOwner`, `isUnclaimed`, política `ai_config_claim`). A página `/app/treinamento` (treinamento da IA, gestão de vídeos e de códigos de acesso) **não é portada**, e o link para ela some do menu e do assistente. Uma página de administração própria será desenhada depois.
- i18n (i18next e afins). Textos ficam fixos em português no código.
- Pagamento (Stripe). O acesso continua por código.
- Mudanças de visual, cores, layout ou conteúdo.
- Escolha do modelo da OpenRouter.
- Migração de dados ou de contas.

## Anti-objetivos (falha mesmo se "funcionar")

- Sobrar qualquer pedaço do Enter: `@enter-pro/analytics-sdk`, `vite-plugin-enter-dev`, `api.enter.pro`, `opentrust.net`, variáveis `VITE_ENTER_*`/`ENTER_*`, comentários "EnterCloud", pasta `.enter/`, badge/README do Enter, chave `X-Enter-Project-ID`.
- Chave da OpenRouter ou service role do Supabase chegando ao navegador.
- O visual mudar. Uma aluna não deve perceber diferença além do nome.
- Mexer no projeto original `ShopStudio/`. Ele só é lido.

## Decisões tomadas pela dona

- Nome: **Shop Studio**.
- Next.js, pnpm, pasta nova `ShopStudioTTK`.
- Supabase próprio, totalmente desacoplado do Enter, começando vazio.
- Roteiros via OpenRouter, com o modelo a definir.
- Cores e layout intactos.
- Sem i18n por enquanto.
- Assistente desligado da IA do Enter, a ser religado depois.
- Sem lógica de dona/primeiro acesso. Administração vira página própria no futuro.

## Decisões minhas (marcadas para revisão)

- **Rotas mantêm os mesmos caminhos**: `/`, `/entrar`, `/redefinir`, `/app`, `/app/capitulos`, `/app/capitulos/[slug]`, `/app/assistente`, `/app/roteiros`, `/app/checklist`, `/app/resultados`, `/app/campeoes`, mais 404. `/app/treinamento` sai.
- **Porte fiel, não reescrita.** As páginas e componentes atuais viram componentes cliente (`"use client"`) quase sem mudança: `react-router-dom` vira `next/link`/`next/navigation`, e `lazy`/`lazyPage` some porque o Next já divide o código por rota. As guardas `RequireAuth`/`RequireAccess` e o `AppShell` viram o `layout.tsx` de `/app`.
- **Sessão continua no navegador** (`@supabase/supabase-js` com `localStorage`, igual hoje), sem `@supabase/ssr` nem middleware. A rota de roteiro recebe o `Authorization: Bearer <access_token>` e valida com `supabase.auth.getUser(token)`. Isso pode mudar quando a página de admin chegar.
- **Regra de acesso, igual no cliente e no servidor:** tem acesso quem tem linha em `entitlements` **ou** quando o modo revisão está ligado. O modo revisão vira uma constante única compartilhada (`ACESSO_ABERTO_PARA_REVISAO = true` em `src/lib/access.ts`), lida tanto pelo hook quanto pela rota de roteiro. Hoje a função de roteiro do Enter ignora o modo revisão; a nova não ignora.
- **Rota `POST /api/roteiro`** (route handler do Next, runtime Node) substitui a edge function `ai-script`:
  - valida login e acesso (regra acima);
  - lê `ai_config` (`tom`, `persona`, `evitar`) e `ai_knowledge` (`titulo`, `conteudo`, ordenado por `ordem`) com a **service role** no servidor, como a função atual fazia;
  - monta o mesmo `METHOD` e `SYSTEM_PROMPT` de `supabase/functions/ai-script/index.ts`, com "Shop Club" trocado por "Shop Studio";
  - chama `https://openrouter.ai/api/v1/chat/completions` (formato OpenAI) com `OPENROUTER_API_KEY` e `OPENROUTER_MODEL`, sem streaming;
  - devolve o mesmo JSON que o frontend (`script-generator.tsx`) já espera, mantendo o parsing/validação atual da resposta.
- **Edge functions somem.** Nem `ai-script` nem `ai-chat` são portadas como funções do Supabase.
- **Banco:** uma migração única `supabase/migrations/<timestamp>_init.sql` com o estado final das 15 migrações atuais, sem os `update ... owner_id` de teste, sem os `delete` de arquivos de teste e sem `owner_id`/`ai_config_claim`. As tabelas que hoje só a dona escreve (`ai_config`, `ai_knowledge`, `access_codes`, `chapter_videos` e o bucket de vídeos) ficam **somente leitura para usuárias logadas**: só a service role escreve, ou seja, pelo painel do Supabase até existir a página de admin. `ai_config` nasce com a linha `id = 'default'` **já preenchida** com o `tom`, `persona`, `evitar` e `exemplos` da última migração (`migration_20261021_185810000`), trocando só o nome: "Shop Club" vira "Shop Studio" e "o clube" vira "o Studio". Assim o tom dos roteiros não muda, e a dona pode editar o texto pelo painel. A função `redeem_access_code` e as demais políticas "só o próprio usuário" continuam iguais. `ai_personas` **não** é recriada, porque já foi apagada no estado final das migrações.
- **E-mails de autenticação:** para desenvolvimento e testes, vale o envio padrão do Supabase (confirmação de cadastro, redefinição de senha e link mágico via `signInWithOtp`, que continuam como estão no `Auth.tsx`). SMTP próprio, domínio de produção e URLs de redirecionamento ficam para o lançamento, porque dependem de domínio e provedor que ainda não existem. O critério "redefinir senha" é testado com um e-mail da equipe do projeto Supabase.
- **Renomeações internas:** prefixo de código `SHOPCLUB-` vira `SHOPSTUDIO-` (em `gerarCodigo`, que pode ficar sem uso até o admin existir), bucket `club-videos` vira `studio-videos`, e `manifest.webmanifest`, `<title>`, metas e `brand.tsx` passam a dizer "Shop Studio".
- **Identidade provisória (aprovada pela dona: "SS por enquanto"):** os ícones (`favicon.ico`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) são regerados com o monograma "ss" no mesmo estilo, cores e fonte do "sc" atual. O `Wordmark` de `brand.tsx` passa a dizer "shop studio." (uma linha) e "shop / studio." (empilhado). Pequenos ajustes de tamanho e espaçamento são permitidos só onde "studio" quebraria a linha ou estouraria o espaço. A identidade definitiva vem depois.
- **Analytics:** o SDK do Enter sai sem substituto.
- **Tipos do banco:** gerados com `supabase gen types typescript` a partir do projeto novo, substituindo o `types.ts` do Enter.
- **Variáveis de ambiente** (`.env.example` no repositório, `.env.local` fora do git): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`.
- **Hospedagem pensada para Vercel**, mas nada específico da Vercel no código.

## Restrições

- pnpm.
- Visual idêntico: os tokens de `src/index.css`, `tailwind.config.ts`, as fontes (hoje carregadas no `index.html`) e os componentes shadcn reestilizados vêm junto.
- O conteúdo (`src/content/*`: capítulos, ganchos, checklist da semana 1, desafio, textos de treinamento) é copiado como está, só com a troca de nome.
- O original `ShopStudio/` não é alterado.

## Deixado para quem constrói

- Versões do Next, React, Tailwind e o jeito de levar o Tailwind para o Next (o original mistura config v3 com `@tailwindcss/postcss`), desde que o visual não mude.
- Fontes via `next/font` ou `<link>`.
- Estrutura de pastas (`src/app` ou `app`), desde que siga o `CodeGuideline.md` do original no que couber.
- Copiar só os componentes shadcn e dependências realmente usados. Os que nenhuma tela usa ficam de fora.
- Texto e forma do aviso de "em breve" no assistente.
- Configurar o projeto Supabase (CLI `supabase link`/`db push`). A dona fornece as credenciais.

## Como saber que ficou pronto

- `pnpm build` e `pnpm lint` passam em `ShopStudioTTK/`.
- `grep -riE "enter\.pro|opentrust|@enter-pro|enter-dev|ENTER_|EnterCloud|shop ?club|shopclub|club-videos"` no repositório novo (fora de `node_modules`) não encontra nada.
- Com um Supabase novo e uma chave da OpenRouter: dá para criar conta, entrar, redefinir senha, ler um capítulo e marcar como concluído, marcar o checklist, gerar e salvar um roteiro, ver resultados/campeões e cadastrar um caso de sucesso. A tela do assistente abre sem erro.
- Com o modo revisão desligado, uma conta sem código cai na tela de desbloqueio, e um código criado pelo painel do Supabase libera o acesso.
