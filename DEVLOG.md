# DEVLOG

Diário de desenvolvimento do Shop Studio: o que foi feito, em que ordem e **por quê**. As entradas mais recentes ficam no topo. Para o estado atual e como rodar, veja o [`README.md`](README.md).

---

## 2026-11-06: Vídeos do roteiro pelos mais engajados

**Problema:** os vídeos embaixo do roteiro eram relevantes, mas fracos: a ordem era a do buscador, sem saber quantas pessoas viram ou curtiram.

**O que a Brave já trazia:** com `extra_snippets=true`, a página de cada vídeo vem com o texto que o próprio TikTok publica: `19.1K Likes, 120 Comments. TikTok video from…`. Visualizações não aparecem ali. Curtidas e comentários são o melhor sinal de engajamento sem scraping.

**Testes reais** (58 buscas, 6 produtos: air fryer, sérum vitamina c, escova alisadora, pijama feminino, garrafa térmica, protetor solar facial):
- **Goggle** (`goggles`, regra inline `$discard` + `/video/`): descarta as páginas `/discover`, que ocupavam metade dos 20 resultados. 1 busca com goggle rende o mesmo que 3 páginas (`offset` 0/1/2) sem ele. Com goggle, o `offset` não traz mais nada.
- **`OR` funciona** (não está na documentação, que lista `""`, `-`, `site:` e `filetype:`). `site:tiktok.com/@` volta 0; `-discover` não muda nada; o termo `tiktok shop` volta 0 vídeos; `freshness=py` só traz `/discover` (com goggle, 0).
- **Termos diferentes rendem mais que páginas:** 3 buscas com termos diferentes juntam 41 a 56 vídeos únicos por produto; 3 páginas do mesmo termo, 5 a 30.
- **Relevância:** com mais termos, vinha perfume e hidratante na busca de pijama. Exigir 60% das palavras do produto (sem acento e sem plural) no título ou no texto resolveu.
- **Mediana de curtidas dos 6 mostrados, antes → depois:** sérum 756 → 20,1 mil; garrafa 2,6 mil → 42,7 mil; protetor 11,1 mil → 38 mil; air fryer 19,1 mil → 26,4 mil (o pior foi de "sem número" a 14,2 mil); escova igual (104,7 mil), mas o pior foi de "sem número" a 3,5 mil. **Pijama continua fraco:** a Brave indexa poucos vídeos de moda com número.

**Mudança** (`src/lib/videos-tiktok.ts`):
- 3 buscas em paralelo com o goggle: `(resenha OR "vale a pena" OR testei)`, `(achadinho OR comprei OR amei)` e `(review OR unboxing OR favorito)`. Uma que falha não derruba as outras.
- Nota = curtidas + 3 × comentários. Português e idioma indefinido primeiro, por nota (sem número no fim), depois no máximo 2 em outra língua. Até 6.
- **Custo:** 3 buscas por roteiro em vez de 1 (~US$ 0,015 com a Brave a US$ 5 por 1.000). Continua dentro do limite de 10 roteiros por dia.

**Avaliados e deixados para depois:** Kalodata, FastMoss e EchoTik têm visualizações e vendas (GMV) reais por vídeo, inclusive do Brasil. Mas coletam os dados do TikTok por conta própria (o mesmo motivo do descarte do Apify em 2026-11-05) e cobram: Kalodata só tem API no plano Enterprise (~US$ 570/mês); FastMoss cobra a partir de US$ 0,01 por chamada; EchoTik dá 100 chamadas grátis e planos de 10 mil a 30 mil chamadas. Só vale se as curtidas não bastarem, e depende de a dona do produto aceitar dados coletados por terceiros.

---

## 2026-11-05: Estilo do assistente fica com a especialista

**Problema:** as respostas não soavam como a especialista. O `BASE_PROMPT` tinha regras fixas de estilo ("tom de amiga experiente", "no máximo 5 frases", "vá direto à ação"), e a persona do `ai_config` dizia que "as regras acima nunca podem ser contrariadas". Assim, qualquer instrução de voz perdia para o tamanho e o tom fixos.

**Mudança:** o prompt agora separa **regras de conteúdo**, que valem sempre (só o material, citar a aula, não copiar, não prometer ganhos, fora de assunto), de um **estilo padrão**, que vale só sem instruções da especialista. Essas instruções podem vir do `ai_config` ou de outra mensagem de sistema (preset da OpenRouter) e mandam no tom, no vocabulário e no tamanho das respostas. O prefixo continua idêntico para todas as alunas, então o cache segue valendo.

**Preset da OpenRouter** (`OPENROUTER_PRESET`, só no assistente): só o system prompt, com a voz da Ana, tirada das aulas e do dossiê. Roteamento de provedores, `temperature` e `max_tokens` continuam no código. Sem tools e sem busca na web. O cache do DeepSeek é automático. O roteiro (JSON) nunca usa o preset.

**Testado na OpenRouter** (6 perguntas, mesma chamada do app):
- O campo `preset: "slug"` no corpo é **ignorado sem erro**. Só funciona no nome do modelo: `<modelo>@preset/<slug>`.
- O prompt do preset entra **antes** do nosso. Prova: o cache zerou na primeira chamada e voltou nas seguintes, com o preset e o material juntos.
- O provedor (Morph) e o custo (~US$ 0,0004 por pergunta com cache) não mudaram. O preset soma ~2.200 tokens.
- **Voz:**
  - antes, as respostas vinham com "gnt", "pq" e 🎀 (da persona do `ai_config`) e sempre terminavam em "Próximo passo:";
  - com o preset e sem a persona, apareceram "tá?", "minha filha", "pelo amor de Deus", a dúvida antecipada e o acolhimento seguido do puxão de orelha;
  - com o preset e a persona juntos, as duas brigavam (o "gnt" voltava e as respostas encurtavam).
- Por isso, com o preset ligado, a persona do `ai_config` não entra no assistente. Ela continua no roteiro.
- **Segunda versão do preset:** a primeira criou um bordão novo ("Bora…, combinado?" em quase toda resposta) e entregava ganchos reais da Ana prontos. A segunda pede fechamentos variados, citação da aula de onde a informação saiu e ganchos novos (o do dossiê só como mecanismo). O bordão sumiu e o gancho passou a ser novo.

**Resultado medido** (marcas de fala nas 6 respostas, ~700 palavras em cada rodada):

| Marca | Na transcrição | Antes | Com o preset |
|---|---|---|---|
| "tá?" | 420× | 0 | 6 |
| "minha filha" | 32× | 0 | 3 |
| "ó," | 119× | 0 | 2 |
| "gnt", "pq" | nunca | 6 | 0 |
| 🎀 / "Próximo passo:" | nunca | 2 / 4 | 0 / 0 |

Também apareceu a postura das aulas 1 a 3: acolher e dar o puxão de orelha, "para de se comparar", o combinado 50 a 50, antecipar a dúvida da aluna e devolver uma pergunta prática. O conteúdo seguiu igual: sem promessa de prazo e dizendo quando o material não cobre o assunto.

### Próximas melhorias da voz

**1. Citações trocadas.** O modelo acerta a informação, mas às vezes põe a citação da aula errada, e uma citação errada derruba a confiança da aluna na resposta inteira.
- "Produto diferente do link dá restrição" saiu como Aula 6 em três rodadas seguidas. Isso está só na Aula 10. A regra genérica do preset ("cite a aula de onde a informação saiu") não resolveu.
- Os vídeos campeões de pijama foram citados como "Aula 15", mas estão no dossiê (a transcrição nem tem a palavra "camisetão").
- **Causa provável:** o modelo associa o assunto da pergunta (link no vídeo) à aula daquele assunto e cola ali uma informação que veio de outra. Com ~78 mil tokens de material, isso é esperado num modelo rápido.
- **Caminhos, do mais barato ao mais caro:**
  1. linhas específicas no preset para os erros que se repetem (ex.: "restrição é da Aula 10"; "vídeos campeões estão no dossiê, cite 'dossiê'");
  2. marcar no próprio material de onde vem cada parte, para o dossiê nunca parecer aula;
  3. conferir no servidor se a aula citada contém os termos da frase. Isso exige um índice e só vale se os casos 1 e 2 não bastarem.

**2. Marcas que ainda faltam.** "né?" (213× na transcrição) e "gente" como chamamento (302×) quase não aparecem: o modelo prefere "amiga" e "tá?". O preset lista as duas, mas sem peso. Dá para dizer quais são as mais frequentes e pedir que apareçam. Cuidado com o exagero: as mesmas marcas em toda frase soam como caricatura, e já aconteceu com o "combinado?".

**3. Erros da transcrição automática.** "Shopp girls" (2×) e "shopping girl" (4×) foram repetidos pelo modelo ("Shopp Girls"). Corrigir para "Shop Girl" direto no `transcricao.md`, o que zera o cache uma vez.

**4. Primeira pessoa.** Uma resposta disse "eu gosto de deixar clarinho", uma preferência da Ana dita como se fosse da assistente. O preset proíbe contar as experiências dela como próprias, mas nem sempre o modelo obedece. Vale acompanhar.

**5. Avaliação repetível.** Por enquanto a comparação é feita à mão, com 6 perguntas. As ~20 perguntas de referência (ideia já em aberto) deveriam virar um script no repositório, com a contagem de marcas e a conferência das citações. Assim cada mudança no preset ou no prompt é medida, e não só lida.

**Como testar:** chamar a OpenRouter com o mesmo prompt do app (`buildAssistantSystemPrompt`), os mesmos provedores e os mesmos parâmetros, com `<modelo>@preset/<slug>`. Depois de editar o preset, a primeira chamada tem que vir com o cache zerado. Se não vier, a versão nova não entrou.

---

## 2026-11-05: Vídeos do TikTok embaixo do roteiro

**Pedido:** depois de gerar o roteiro, mostrar vídeos do TikTok sobre aquele produto. Não precisam ser os mais recentes, mas os mais relevantes, de preferência em português, deixando claro que é uma amostra.

**Opções avaliadas:**
- **Scraping do TikTok:** os termos de uso proíbem coleta automatizada sem autorização, e o anti-bot quebra o scraper com frequência. Descartado. Serviços de terceiros (Apify, ScrapeCreators…) fazem o mesmo por baixo.
- **APIs oficiais:** a Research API é só acadêmica e sem fins comerciais; a Display API mostra só os vídeos da própria conta; a API de parceiros do TikTok Shop exige aprovação como empresa e não tem busca de vídeos conhecida.
- **Embutir a busca do TikTok:** impossível, porque a página responde `x-frame-options: SAMEORIGIN`. O TikTok só deixa embutir um vídeo por vez (ou um perfil).
- **Google Custom Search:** fechada para clientes novos e desligada em 2027-01-01.
- **Brave Search API + player oficial:** escolhida. O buscador acha as URLs e o vídeo toca no player do TikTok, que é permitido.

**Testes reais com a Brave** (~60 buscas, 12 produtos):
- Com filtro de data (`freshness`) só voltam páginas `/discover`, que não dá para embutir. Sem ele, os vídeos vêm, mas de 2022 a 2026: o índice não acompanha o que acabou de sair.
- O endpoint de vídeos da Brave não traz nada do TikTok; só o de web.
- Acrescentar **"resenha"** ao termo foi o que mais ajudou: air fryer foi de 1 para 10 vídeos em português, e o sérum de vitamina C (o pior caso, cheio de vídeos em espanhol) de 1 para 4. `country=BR` + `search_lang=pt-br` ajudam um pouco.
- O campo `language` da Brave erra (marcou título em português como `en`). Por isso o idioma sai de uma heurística por palavras do título. Os trechos extras foram ignorados, porque vêm com texto em inglês ("TikTok video from…").
- Resultado final: 3 a 6 vídeos por produto, quase todos em português e sobre o produto.

**Decisões:**
- A busca roda **dentro de `/api/roteiro`**, em paralelo com a IA: não atrasa, usa o mesmo limite diário (protege a cota da Brave) e não precisa de rota nova.
- Falha da Brave ou falta da chave nunca derruba o roteiro.
- Até 6 vídeos, português primeiro, no máximo 2 em outra língua, marcados com "outro idioma".
- A tela tem também o link "Ver os mais recentes no TikTok" (busca do próprio TikTok), para quem quer o que acabou de sair.
- Os vídeos vão junto quando o roteiro é salvo; como o salvo volta do navegador, a tela só mostra URLs do TikTok.
- **Capa dos vídeos:** a miniatura da Brave aponta para a página do vídeo e dá 422, e o oEmbed do TikTok não traz mais `thumbnail_url` (só o HTML do player). Por isso a seção carrega o próprio player já (`previa` no `VideoEmbed`, sem autoplay, iframe lazy), que mostra a capa. Nos capítulos e campeões continua o toque para carregar.
- O título embaixo de cada vídeo é link para o vídeo no TikTok.

**Verificado:** testes, lint e build. No navegador, com uma conta de teste (apagada no fim): roteiro de "escova alisadora de cabelo" com 6 vídeos em português, o player do TikTok tocando sem erro de CSP, e a tela em 375 px com 2 colunas.

---

## 2026-11-05: Login por e-mail + senha, conta criada por webhook

**Pedido:** tirar o login social e usar e-mail + senha (JWT). A conta da cliente é criada por um webhook da plataforma de venda, com uma senha temporária; no primeiro acesso ela define a sua. A marca de "senha temporária" não pode ser pública nem visível pelo console. A compra já libera o acesso. Como a senha temporária chega à cliente fica para depois (serviço de e-mail), então por enquanto o webhook só a devolve.

**Decisões:**
- **Supabase Auth, não JWT próprio.** O token do Supabase já é um JWT, e a senha é guardada com hash bcrypt pelo próprio Supabase. Montar um login próprio só duplicaria isso.
- **Cadastro público desligado** (`enable_signup = false`), com o provedor de e-mail ligado só para o login. Isso mantém fechado o achado 1 da auditoria (conta criada com a anon key). O teste de configuração passou a exigir isso.
- **Marca numa tabela, não no `app_metadata`:** os metadados do usuário vão dentro do JWT, que fica no `localStorage`. A tabela `senhas_temporarias` não tem privilégio para `anon`/`authenticated`, e a tela só recebe `trocarSenha: true/false`.
- **Criação atômica:** a marca e o `entitlement` vão numa consulta só (CTE). Se ela falhar, o usuário criado é apagado, para não sobrar uma conta com a senha temporária valendo como definitiva.
- **Segredo + CORS:** a pessoa pediu que só a origem da plataforma tenha acesso, configurável (`WEBHOOK_CONTA_ORIGENS`). O `Origin` sozinho não protege, porque um servidor não manda e um `curl` forja. Por isso o segredo `WEBHOOK_CONTA_SEGREDO` é obrigatório, comparado em tempo constante.
- **`POST /api/senha` só com a senha temporária pendente:** sem pedir a senha atual, um token roubado não serve para trocar a senha de quem já definiu a sua.
- Senha nova com no mínimo 6 caracteres, igual ao `minimum_password_length` do Supabase. E-mail já cadastrado responde 409.

**Achado no teste ponta a ponta:** trocar a senha pela API admin **derruba as sessões abertas**, e o token antigo passa a receber 401. A tela de definir senha agora entra de novo com a senha nova logo depois da troca.

**Saiu:** o botão e o fluxo do Google, o `[auth.external.google]` do `config.toml`, as variáveis `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` e o `flowType: "pkce"`.

**Verificado:**
- Testes, lint e build sem avisos.
- Ponta a ponta no Supabase local:
  - cadastro pela anon key → `signup_disabled`;
  - webhook sem segredo → 401, com origem estranha → 403, repetido → 409;
  - login com a temporária, com a marca fora do JWT;
  - rotas bloqueadas até a troca;
  - depois da troca, a temporária não entra mais e a senha nova entra.
- No navegador: senha errada, senha temporária, "Defina a sua senha" e o painel, sem erros no console. Os usuários de teste foram apagados.

**Ajustes pedidos em seguida:**
- `trocarSenha` só aparece em `GET /api/acesso` enquanto existe a linha da aluna em `senhas_temporarias`. Depois da troca, a resposta é só `{ acesso }`, para que nada mostre que a conta já teve senha temporária. Conferido de novo que o JWT não leva nada disso: o `app_metadata` tem só o provedor.
- **Validade de 30 minutos**, calculada pelo `now()` do banco. Expirada, todas as rotas e a troca respondem 403 e a tela mostra "expirou". Chamar o webhook de novo para o mesmo e-mail gera outra senha e renova o prazo, e a antiga deixa de entrar. O 409 ficou só para quem já definiu a própria senha. Isso foi decisão minha, porque sem ela uma conta expirada ficaria sem saída.
- Verificado no banco real, simulando 31 minutos com um `update` em `criada_em`.

**Blindagem do Supabase** (testado com a chave pública no local):
- **Já estavam fechados:** tabelas e GraphQL (503), storage (listar volta `[]`, enviar e criar bucket dão 403 pelo RLS), admin (403), cadastro e otp (`signup_disabled`).
- **Estavam abertos:** o websocket do realtime e o `/recover`, que manda e-mail de recuperação para qualquer conta existente.
- **Mudanças:**
  - realtime desligado;
  - token de 15 minutos;
  - reautenticação para trocar a senha direto no Supabase;
  - 10 logins a cada 5 minutos por IP;
  - modelos de e-mail de recovery, magic link, troca de e-mail e reautenticação sem link nem código (`supabase/templates/sem-link.html`).
- **Conferido depois de reiniciar:** o websocket não conecta mais, e o e-mail de recuperação chega no Mailpit sem link.
- O checklist do painel de produção foi para o README.

**Fica para depois:** serviço de e-mail (enviar a senha temporária e "esqueci minha senha") e o formato de assinatura da plataforma de venda que for escolhida (hoje é `Authorization: Bearer`).

---

## 2026-11-04: Auditoria de segurança

**Pedido:** testar a segurança antes de ir para produção, com atenção ao login social, aos cookies e à sessão, e corrigir o que aparecesse.

**Contexto importante:** o app **não usa cookies** para a sessão. O Supabase guarda a sessão no `localStorage`, e as rotas de IA recebem o token no cabeçalho. Por isso CSRF não se aplica, mas um script injetado (XSS) conseguiria ler o token. Isso definiu as prioridades.

**Como foi testado:** no ambiente local, com duas contas de teste ("aluna A" e "aluna B") criadas e apagadas no fim. Usei chamadas diretas à API do Supabase com a chave pública (o que qualquer pessoa pode fazer), chamadas às rotas do app e o navegador. Também rodei `pnpm audit`, sem vulnerabilidades conhecidas.

**Achados e correções:**

| # | Gravidade | Achado | Correção |
|---|---|---|---|
| 1 | Alta | Cadastro por e-mail/senha aberto: com a anon key criei `intruso@qualquer.com`, que saiu logada e, com o modo revisão, passava pela checagem do assistente. | `[auth.email] enabled = false`. Cadastro e login por e-mail agora voltam `email_provider_disabled`; o Google segue funcionando. |
| 2 | Média | Nenhum cabeçalho de segurança e `X-Powered-By: Next.js`. | CSP (`connect-src` só app + Supabase, `frame-ancestors 'none'`, `object-src 'none'`…), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS e `poweredByHeader: false` (`src/lib/seguranca.ts`). No navegador, um `fetch` para fora com o token foi bloqueado, enquanto o assistente e as fontes continuaram funcionando. |
| 3 | Média | Gerador de roteiros sem limite (custo). | 10 por dia, contados em `ai_perguntas` com a coluna nova `rota`. O custo dos roteiros também passou a ser registrado. A reserva, a liberação e o custo foram unificados em `api-auth.ts`. |
| 4 | Média | Código de acesso sem limite: 60 tentativas em 1 s. | `redeem_access_code` grava as tentativas erradas (`access_code_tentativas`, sem acesso direto) e bloqueia depois de 10 por hora. A tela mostra a mensagem. |
| 5 | Média | `chapterTitle` em texto livre entrava no prompt de sistema (injeção). O modelo ignorou no teste, mas a brecha existia. | O navegador manda só o slug (`capitulo`), e o servidor busca o título com `getChapter`. Teste cobre o texto malicioso. |
| 6 | Baixa | `midia_url` dos casos de sucesso aceitava qualquer coisa (`javascript:`, `http:` de rastreio) e aparece para todas as alunas. | Constraint `success_cases_midia_https` e aviso na tela. |
| 7 | Baixa | Nada no prompt proibia copiar o material pago (o modelo recusou por conta própria). | Regra explícita no prompt, com teste. |
| 8 | Baixa | Token antigo lê o banco até 1 h depois do logout (as rotas de IA já recusam). | Só documentado: é o padrão do Supabase, encurtável no painel. |

**O que estava seguro:**
- Leitura e escrita cruzadas entre alunas (RLS).
- Tabelas de admin.
- Apagar o próprio histórico para burlar o limite.
- Upload no bucket de vídeos.
- Acesso sem login.
- `?de=` (só aceita `/app…`).
- Fluxo PKCE do Google.
- Ausência de `dangerouslySetInnerHTML`.

**Efeito colateral para quem desenvolve:** sem o provedor de e-mail, testar telas logadas exige ligá-lo temporariamente (o CLAUDE.md explica e alerta para não commitar). Durante a verificação, um 500 em `/api/roteiro` era só o `next dev` com o módulo antigo em memória; reiniciar resolveu.

**Observação fora do escopo:** as respostas do assistente aparecem com `**markdown**` cru, porque a tela mostra texto puro. É só aparência.

---

## 2026-11-04: Bug: a conta nova caía na última página da conta anterior

**Sintoma relatado:** ao entrar com uma conta Google nova, o app parava na última página em que a outra conta estava.

**Investigação:**
- Os logs do Supabase mostraram que **o login em si funcionou**: as duas contas Google foram criadas, a troca PKCE deu certo e os perfis foram gravados com o nome do Google.
- A pista estava no início do segundo login, que partiu de `/entrar?de=/app/assistente`.
- Reproduzido: no assistente, clicar em "Sair da conta" levava a `/entrar?de=%2Fapp%2Fassistente`.

**Causa raiz:** a guarda da área logada (`src/app/app/layout.tsx`) via a sessão sumir e não sabia o motivo. Tratava o "Sair" como uma sessão expirada e guardava a página atual para voltar depois do login. Quem entrasse em seguida, com qualquer conta, era levada para lá.

**Correção:**
- O `AuthProvider` ganhou `saiu`: vira `true` no `signOut()`, antes da sessão sumir, e volta a `false` no próximo `SIGNED_IN`.
- A guarda usa `destinoSemSessao(pathname, saiu)` (`src/lib/navegacao.ts`, com teste): quem clicou em sair vai para `/entrar` limpo, e quem perdeu a sessão sozinha continua voltando para onde estava.
- Conferido que os caches de dados pessoais (progresso, checklist, acesso, perguntas) já eram separados por usuário, então não havia vazamento de dados entre contas.

**Verificado no navegador:** sair do assistente leva a `/entrar`. Abrir `/app/roteiros` sem sessão leva a `/entrar?de=%2Fapp%2Froteiros`.

---

## 2026-11-04: Login só com Google

**Pedido da dona:** deixar apenas o Google como forma de entrar. Na primeira vez, o app cria o acesso; quem já tem conta segue o fluxo normal. Motivo da escolha do Google: é o provedor mais simples de configurar.

**O que mudou:**
- `/entrar` agora tem só o botão "Entrar com Google" (`supabase.auth.signInWithOAuth`). Saíram e-mail/senha, as abas "Entrar/Primeiro acesso", o link mágico, o "esqueci minha senha" e a página `/redefinir`, e com ela o redirecionamento do `PASSWORD_RECOVERY` (que era o único aviso do lint).
- O cliente do Supabase passou a usar **PKCE** (`flowType: "pkce"`): o Google devolve `?code=` e o cliente troca pela sessão sozinho.
- **Primeiro acesso:** o `ensureProfile` já gravava o perfil só uma vez (`ignoreDuplicates`). Agora o nome vem do Google (`full_name`/`name`, em `src/lib/nome.ts`, com teste), e o painel cumprimenta pelo primeiro nome. Depois disso, a aluna segue o fluxo de sempre: código de acesso, ou entrada direta no modo revisão.
- **Supabase local:** `[auth.external.google]` no `config.toml` lê o Client ID e o Secret do `.env.local` (`env(...)`), com `skip_nonce_check = true`, que o Supabase local exige. O `pnpm db:start` agora carrega o `.env.local` antes de subir.
- **Cliente OAuth no Google Cloud** (tipo Aplicativo da Web): origem `http://localhost:3000`; redirecionamento `http://127.0.0.1:54321/auth/v1/callback`. Em produção, origem `https://<domínio>` e redirecionamento `https://<ref>.supabase.co/auth/v1/callback`.
- O provedor de e-mail continua ativo no servidor, só fora da interface, para permitir criar usuários de teste pela API.

**Achado no caminho (corrigido):** duas falhas vinham da migração, ambas porque o Next não tem o `#root` do Vite.
- A tela de entrada não ocupava a altura toda. Corrigido com `min-h-dvh` no lugar de `min-h-full`.
- O menu lateral rolava junto com o capítulo. O `overflow-x: hidden` em `html`/`body` transformava o body em contêiner de rolagem, e o `sticky` deixava de funcionar. Trocado por `overflow-x: clip`, que corta a rolagem lateral do mesmo jeito sem esse efeito.

**Verificado:**
- 52 testes, lint sem avisos, build ok.
- O `/auth/v1/authorize?provider=google` do Supabase local redireciona ao Google com a URI de callback correta.
- No navegador, a tela nova ocupa a altura toda e o menu lateral fica parado ao rolar.
- **Ainda não testado:** a volta do Google com uma conta real, que precisa de uma pessoa logando.

---

## 2026-11-04: Documentação e organização

- Criados `CLAUDE.md` (guia para agentes) e este `DEVLOG.md`. O `README.md` foi refeito.
- **Testes saíram de `src/` para `tests/`,** espelhando a estrutura (`tests/lib/…`, `tests/app/api/…`). O Vitest só procura em `tests/**/*.test.ts`, e os imports usam `@/…`.
- **O material da IA virou `.md` editável e o script `scripts/gerar-conhecimento.py` foi removido** (ver a próxima entrada).

### O script `gerar-conhecimento.py` (removido)

**O que fazia:** transformava os dois documentos de origem, `Shop_Club_Transcricao_Completa.pdf` (89 páginas) e `DOSSIE_DEFINITIVO_SEGUNDA_MENTE_TIKTOK_SHOP.docx`, no texto que a IA recebe. Passos:

1. **PDF → texto** com `pdftotext`. Descartava capa e sumário, ou seja, tudo antes do primeiro marcador `AULA 01` (que no PDF vem precedido de quebra de página `\f`).
2. **Uma seção por aula:** o título vinha da linha "Título original no Panda Vídeo: … .mp4", porque o título da primeira linha quebrava no PDF ("…Central" em vez de "…Central do Criador etc"). O resultado foi `## Aula N - título`.
3. **Limpeza:** removia rodapés ("Shop Club — Transcrição Completa das Aulas"), números de página e a linha de metadados (pasta, duração). Juntava as linhas quebradas pelo PDF em parágrafos.
4. **Marcações de tempo** `m:ss – m:ss` viravam `[m:ss – m:ss]` no início de cada trecho. É isso que permite ao assistente citar "(Aula 7, 3:12)".
5. **Vídeos de venda fora:** "Upsell 1" e "Vídeo Obrigado Upsell" foram ignorados, para o assistente não sair oferecendo upsell.
6. **Troca de nome:** "Shop Club" virava "Shop Studio", incluindo os erros da transcrição automática "Chap Club", "Shopp Club" e "Shopping Club".
7. **DOCX → texto:** lia o `word/document.xml` do arquivo, com uma linha por parágrafo e o mesmo rename.

**Por que foi importante:** sem essa limpeza, o modelo receberia ~250 mil caracteres com sumário, rodapés repetidos a cada página, títulos cortados e o nome antigo da marca. Isso gastaria tokens à toa e faria o assistente citar errado. As marcações de tempo preservadas são o que deixa as respostas verificáveis.

**Por que saiu:** a dona preferiu editar o texto direto daqui para frente. O resultado do script foi mantido em `src/lib/conhecimento/transcricao.md` (39 mil palavras, 16 aulas) e `dossie.md` (5,7 mil palavras). Se vierem novas versões em PDF/DOCX, os passos acima são a receita para refazer a conversão.

---

## 2026-11-04: Cache de prompt e escolha de provedor

**Problema:** com o custo real gravado em `ai_perguntas`, uma pergunta custava **US$ 0,014–0,024**, e não os US$ 0,01 estimados. O cenário de 9 perguntas/dia × 20 dias daria ~R$ 20 por aluna, cerca de 20% da mensalidade de R$ 97. No teto do limite chegaria a ~51%.

**Experimento** (3–5 perguntas seguidas, mesmo material de ~75 mil tokens):

| Configuração | Provedor | Cache | Custo/pergunta |
|---|---|---|---|
| sem configuração (antes) | variava | não | US$ 0,014–0,024 |
| `session_id` fixo | CoreWeave | 2 de 3, depois falhou | US$ 0,001–0,023 |
| `provider.order: ["deepseek"]` sem fallback | (bloqueado) | — | erro 404 |
| `provider.order: ["morph/fp8","deepinfra/fp8"]` | Morph | **5 de 5** | **US$ 0,0004** |

**Aprendizados:**
- O mesmo modelo é servido por quase 50 provedores, com preço de entrada de US$ 0,02 a 0,45 por milhão de tokens. **O provedor importava mais que o modelo.**
- O provedor oficial da DeepSeek é **bloqueado pela configuração de privacidade da conta OpenRouter** (ele pode treinar com os dados). O bloqueio foi mantido.
- O `session_id` fixo prende a sessão ao primeiro provedor que respondeu, e no teste ele ignorou a ordenação por preço.
- fp4 e mxfp4 ficaram de fora. fp8 tem perda mínima de qualidade, e as respostas nos testes vieram corretas e citando as aulas.

**Decisão:** `PROVEDORES = { order: ["morph/fp8", "deepinfra/fp8"], quantizations: ["fp8"] }` em `src/lib/api-auth.ts`, valendo para o assistente e o roteiro. A coluna `tokens_cache` foi adicionada em `ai_perguntas`.

**Resultado medido no app:** a 1ª pergunta (cache vazio) custou US$ 0,0018, e as seguintes US$ 0,0004. Isso dá ~R$ 0,60 por aluna/mês no cenário de 9/dia, ~1% da mensalidade. Com isso, **o RAG ficou desnecessário por enquanto**.

---

## 2026-11-04: Limite diário, histórico de perguntas e "perguntar sobre o trecho"

- **Tabela `ai_perguntas`:** texto, capítulo, tokens de entrada/saída e custo em US$ de cada pergunta. A RLS deixa a aluna ler só as próprias, e quem grava é o servidor.
- **Limite de 15 perguntas/dia** (`src/lib/limite.ts`), contado a partir da meia-noite de Brasília (UTC-3 fixo, sem horário de verão desde 2019). A rota responde 429 na 16ª. O aviso "Você ainda pode fazer N perguntas hoje" aparece a partir da 12ª, e aos 15 o campo trava.
- **Pergunta não respondida não conta:** se a OpenRouter falhar, a linha é apagada.
- **Custo lido do stream:** o `usage` (tokens e custo) chega no último evento SSE. `comRegistroDeUso` repassa o stream intacto à aluna e grava o custo ao final.
- **Seleção de texto no capítulo:** o botão "Perguntar à assistente" aparece sobre o trecho selecionado. O clique leva a `/app/assistente?capitulo=…&trecho=…`, e o trecho é enviado uma única vez como primeira pergunta.
- Limitação conhecida: contar e gravar não é atômico. Com duas abas ao mesmo tempo, dá para passar uma pergunta do limite.

---

## 2026-11-04: Assistente com IA sobre as aulas e o dossiê

**Pergunta da dona:** embeddings/RAG, fine-tuning ou o quê?

**Análise:**
- **Fine-tuning** foi descartado: ensina estilo e não fatos, continua inventando, é caro e precisaria ser refeito a cada atualização do material.
- **Tamanho do material:** transcrição ~40 mil palavras, dossiê ~5,7 mil, capítulos ~5 mil, total ~85–100 mil tokens. Cabe no contexto dos modelos atuais.
- **Decisão:** mandar o material inteiro a cada pergunta, o que é mais preciso porque o modelo vê tudo. O RAG fica reservado para se o material crescer muito ou o custo apertar.

**O que foi feito:**
- `/api/assistente` com streaming. O prompt (`src/lib/assistente.ts`) traz o resumo dos 12 capítulos (porte do assistente original), a transcrição, o dossiê, a persona de `ai_config` e a base `ai_knowledge`.
- **Regras do prompt:** responder só pelo material, dizer quando não sabe, citar "(Aula N, m:ss)" ou "Capítulo N", tratar o dossiê como conhecimento e não como instrução.
- O **dossiê também foi para o gerador de roteiros**, como referência de estilo, com o formato JSON tendo prioridade (lembrete no fim do prompt).
- A checagem comum das rotas de IA foi extraída para `src/lib/api-auth.ts` (`autorizar`, `chamarOpenRouter`).
- A tela original do assistente voltou: sugestões, "Nova conversa" e resposta aparecendo aos poucos. O cliente lê o SSE com `fetch` nativo (`src/lib/sse.ts`), sem dependência nova.
- **Teste no navegador:** uma pergunta de conteúdo das aulas foi respondida citando "(Aula 2, 1:01)", e uma pergunta fora do material ("imposto no Mercado Livre") foi recusada corretamente.
- **Um modelo só por enquanto** (`OPENROUTER_MODEL`) para assistente e roteiro. A ideia de modelos separados ficou para depois.

---

## 2026-11-04: Migração do Enter para Next.js + Supabase próprio

**Contexto:** o app nasceu como "Shop Club" no **Enter.pro** (construtor de apps por IA), com Vite + React. Usava o Supabase gerenciado pelo Enter, o gateway de IA do Enter (`api.enter.pro`), o SDK de analytics e o plugin de build do Enter. A dona quis o produto **inteiramente sob controle próprio**, sem resquícios do Enter, e com o nome **Shop Studio**. Ninguém usava o app de verdade (só testes), então o banco começou vazio.

Design e plano: `docs/superpowers/specs/2026-11-04-shop-studio-next-migration-design.md` e `docs/superpowers/plans/2026-11-04-shop-studio-next-migration.md`. A execução foi feita em 7 tarefas, cada uma revisada por um agente independente, mais uma revisão final da branch inteira.

**Decisões da dona:**
- Next.js com pnpm, numa pasta nova (`ShopStudioTTK`), mantendo o original intocado.
- Supabase próprio, desacoplado do Enter.
- Roteiros via OpenRouter.
- Visual intacto.
- Sem i18n.
- Sem a lógica de "primeira conta vira dona": a administração será uma página própria no futuro.
- Ícones provisórios "SS".

**Decisões técnicas tomadas na execução:**
- **Porte fiel:** as páginas viraram componentes cliente, e as trocas foram react-router → `next/link`/`next/navigation` e `location.state.from` → `?de=` (aceita só caminhos que começam com `/app`, o que evita redirecionamento para fora).
- **Sessão no navegador,** como no original. A rota de API valida o token com `supabase.auth.getUser(token)`.
- **Banco:** as 15 migrations do Enter viraram uma inicial, `20261104000000_init.sql`, sem `owner_id`, sem dados de teste e sem `ai_personas` (que o próprio Enter já tinha apagado). Tabelas de admin ficaram só para escrita da service role. O bucket virou `studio-videos`. A persona "Shop Girl" foi mantida, só com o nome trocado.
- **Modo revisão** (`ACESSO_ABERTO_PARA_REVISAO`) num módulo só, usado pela tela e pelo servidor. No original, a função de roteiro ignorava esse modo.
- **`max_tokens` de 1400 para 4000:** o modelo escolhido "pensa" antes de responder, e com 1400 o JSON vinha cortado. Medido: 1.701 tokens de saída, sendo 984 de raciocínio.
- **Ícones** gerados no build com `next/og` (Fraunces semibold, "ss" chocolate sobre `#F6E3E5`), sem dependência nova.
- **`lucide-react` fixado na versão do original:** a 1.x removeu o ícone do Instagram.
- **Recursos experimentais removidos:** `cacheComponents` e `partialPrefetching`, que o scaffold ativou e que mudam a renderização.

**Achados da revisão final e da conferência no navegador** (corrigidos):
- O favicon padrão do Next continuava no projeto.
- **Redefinir senha local:** o `site_url` estava em `127.0.0.1`, e o Next 16 em dev bloqueia essa origem, então o link caía numa página travada. A solução foi `site_url` em `localhost`, `allowedDevOrigins: ["127.0.0.1"]` e redirecionamento para `/redefinir` no evento `PASSWORD_RECOVERY`.
- **Rota de roteiro mais robusta:** limite de 500 caracteres por campo, erro claro quando a leitura do acesso falha, `console.error` nos erros e `maxDuration = 60`.
- O README estava desatualizado.
