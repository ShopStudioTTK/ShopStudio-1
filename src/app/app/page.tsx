"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clapperboard,
  Copy,
  Flame,
  MessageCircleHeart,
  Shuffle,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRoteirosSalvos } from "@/components/script-generator";
import { useAuth } from "@/hooks/use-auth";
import { useGanchos } from "@/hooks/use-ganchos";
import { useNichos } from "@/hooks/use-nichos";
import { useChapterProgress } from "@/hooks/use-progress";
import { chapters, chapterPath } from "@/content/chapters";
import { FORMATOS, FORMATOS_DA_ALUNA, FORMATO_PADRAO, SUGESTOES_DE_PRODUTO, type Formato } from "@/content/formatos";
import { hookCategorias } from "@/content/hooks";
import { primeiroNome } from "@/lib/nome";
import { cn } from "@/lib/utils";

/**
 * Quem está começando vê a trilha logo depois do gerador; quem já vende vê as ferramentas.
 * A escolha fica só neste navegador (é uma conveniência, não um dado da conta).
 */
type Modo = "comecando" | "vendendo";
const CHAVE_MODO = "shopstudio:modo";

const lerModo = (): Modo | null => {
  try {
    const valor = window.localStorage.getItem(CHAVE_MODO);
    return valor === "comecando" || valor === "vendendo" ? valor : null;
  } catch {
    return null;
  }
};

const gravarModo = (modo: Modo) => {
  try {
    window.localStorage.setItem(CHAVE_MODO, modo);
  } catch {
    // navegação privada ou armazenamento bloqueado: só não lembra
  }
};

const diaDoAno = () => {
  const agora = new Date();
  return Math.floor((agora.getTime() - new Date(agora.getFullYear(), 0, 0).getTime()) / 86_400_000);
};

/** O gerador, direto na primeira tela. Manda para /app/roteiros, que gera na hora. */
const Compositor = () => {
  const router = useRouter();
  const [produto, setProduto] = useState("");
  const [formato, setFormato] = useState<Formato>(FORMATO_PADRAO);

  const enviar = (event?: FormEvent) => {
    event?.preventDefault();
    const nome = produto.trim();
    if (nome.length < 2) return;
    const params = new URLSearchParams({ produto: nome, formato, gerar: "1" });
    router.push(`/app/roteiros?${params.toString()}`);
  };

  return (
    <form
      onSubmit={enviar}
      className="ring-gradient relative rounded-[32px] bg-card p-4 shadow-editorial sm:p-6"
    >
      <label htmlFor="studio-produto" className="flex items-center gap-2 px-1 text-[13px] font-semibold">
        <Wand2 className="h-4 w-4 text-rose" />
        Qual produto vai pro vídeo hoje?
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="studio-produto"
          value={produto}
          onChange={(event) => setProduto(event.target.value)}
          placeholder="Ex.: escova alisadora de cabelo"
          autoComplete="off"
          className="h-14 w-full min-w-0 rounded-2xl sm:flex-1 border border-border bg-secondary/50 px-4 text-[16px] font-medium outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground focus:border-rose/50 focus:bg-card"
        />
        <Button type="submit" variant="pop" size="lg" className="h-14 rounded-2xl px-7" disabled={produto.trim().length < 2}>
          <Sparkles className="h-4 w-4" />
          Criar roteiro
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-medium text-muted-foreground">Formato:</span>
        {FORMATOS_DA_ALUNA.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFormato(f.id)}
            data-ativo={formato === f.id}
            aria-pressed={formato === f.id}
            title={f.dica}
            className="chip px-3 py-1 text-[12.5px]"
          >
            <span aria-hidden="true">{f.emoji}</span>
            {f.id}
          </button>
        ))}
      </div>

      {!produto ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-3">
          <span className="mr-1 text-[12px] text-muted-foreground">Sem ideia? Tente</span>
          {SUGESTOES_DE_PRODUTO.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setProduto(s)}
              className="rounded-full px-2 py-0.5 text-[12.5px] font-medium text-rose underline-offset-4 hover:underline"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
};

const GanchoDoDia = () => {
  const { data: ganchos } = useGanchos();
  const [indice, setIndice] = useState(diaDoAno);
  const lista = ganchos ?? [];
  const gancho = lista.length ? lista[indice % lista.length] : null;
  const categoria = gancho ? hookCategorias.find((c) => c.id === gancho.categoria) : null;

  return (
    <article className="hero-surface relative flex flex-col overflow-hidden rounded-[28px] p-6 text-cream shadow-editorial">
      <div className="grain absolute inset-0 opacity-20" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -bottom-16 -right-10 h-56 w-56 rounded-full opacity-50 blur-[70px]"
        style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.8), transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
          <Flame className="h-3 w-3" /> Gancho pra testar hoje
        </p>
        {lista.length > 1 ? (
          <button
            type="button"
            onClick={() => setIndice((i) => i + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            aria-label="Outro gancho"
            title="Outro gancho"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <p className="relative mt-5 flex-1 font-display text-[22px] font-semibold leading-[1.25] tracking-tight sm:text-[25px]">
        {gancho ? (
          gancho.texto.split(/(\[[^\]]+\])/g).map((parte, i) =>
            parte.startsWith("[") ? (
              <span key={i} className="accent-word font-normal text-gold">
                {parte}
              </span>
            ) : (
              <span key={i}>{parte}</span>
            ),
          )
        ) : (
          <span className="text-cream/60">Carregando um gancho…</span>
        )}
      </p>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12px] text-cream/65">{categoria ? `${categoria.label} · ${categoria.hint}` : ""}</span>
        <div className="flex gap-2">
          {gancho ? (
            <Button
              size="sm"
              variant="cream"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(gancho.texto);
                  toast.success("Gancho copiado.");
                } catch {
                  toast.error("Não consegui copiar.");
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          ) : null}
          <Button asChild size="sm" variant="ghost" className="text-cream hover:bg-white/15 hover:text-cream">
            <Link href="/app/roteiros?aba=ganchos">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

const UltimosRoteiros = () => {
  const { data: roteiros = [], isLoading } = useRoteirosSalvos();
  return (
    <article className="flex flex-col rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex items-center justify-between">
        <p className="font-display text-lg font-semibold tracking-tight">Seus roteiros</p>
        <Link href="/app/roteiros?aba=gerador#biblioteca" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose hover:underline">
          Biblioteca <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-secondary/60" />
          ))}
        </div>
      ) : roteiros.length ? (
        <ul className="mt-3 space-y-1">
          {roteiros.slice(0, 3).map((r) => (
            <li key={r.id}>
              <Link
                href="/app/roteiros?aba=gerador#biblioteca"
                className="flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-secondary"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-soft text-base" aria-hidden="true">
                  {FORMATOS.find((f) => f.id === r.formato)?.emoji ?? "🎬"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.produto}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {r.conteudo?.roteiro?.gancho ?? r.formato ?? "Roteiro"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border px-4 py-7 text-center">
          <span className="text-2xl" aria-hidden="true">🎬</span>
          <p className="mt-2 text-[13.5px] font-medium">Nenhum roteiro salvo ainda</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Escreva um produto ali em cima e crie o primeiro.</p>
        </div>
      )}
    </article>
  );
};

const Ferramentas = () => {
  const { data: ganchos } = useGanchos();
  const { data: nichos = [] } = useNichos();
  const tiles = [
    {
      to: "/app/roteiros?aba=ganchos",
      icon: Sparkles,
      titulo: "Banco de ganchos",
      texto: ganchos ? `${ganchos.length} frases prontas pra adaptar` : "Frases prontas pra adaptar",
      cor: "bg-rose-soft",
      icone: "bg-rose text-primary-foreground",
    },
    {
      to: "/app/assistente",
      icon: MessageCircleHeart,
      titulo: "Pergunte pra IA",
      texto: "Comissão, amostra, link, ideia de vídeo",
      cor: "bg-lilac-soft",
      icone: "bg-lilac text-primary-foreground",
    },
    {
      to: "/app/resultados",
      icon: Trophy,
      titulo: "Mural das alunas",
      texto: "Prints de quem já está vendendo",
      cor: "bg-butter",
      icone: "bg-gold text-foreground",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
      <article className="rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Clapperboard className="h-4 w-4 text-rose" /> O que tá vendendo agora
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Vídeos de produto que estão vendendo, escolhidos pela equipe em cada nicho.
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {nichos.map((n, i) => (
            <Link
              key={n.slug}
              href={`/app/campeoes?nicho=${n.slug}`}
              className={cn(
                "group flex items-center justify-between gap-2 rounded-2xl border border-border px-3.5 py-3 text-[13px] font-semibold transition-all hover:-translate-y-0.5 hover:border-rose/40 hover:shadow-soft",
                i === 0 ? "bg-secondary" : "bg-card",
              )}
            >
              {n.rotulo}
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-rose" />
            </Link>
          ))}
          <Link
            href="/app/campeoes"
            className="flex items-center justify-center rounded-2xl border border-dashed border-border px-3.5 py-3 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            Ver todos
          </Link>
        </div>
      </article>

      <div className="grid gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              href={t.to}
              className={cn(
                "group flex items-center gap-4 rounded-[24px] p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft",
                t.cor,
              )}
            >
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", t.icone)}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{t.titulo}</span>
                <span className="block text-[12.5px] text-foreground/60">{t.texto}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};

/** Faixa discreta da trilha do zero (para quem quer revisar o básico). */
const Trilha = () => {
  const { completed } = useChapterProgress();
  const proximo = chapters.find((c) => !completed.has(c.slug)) ?? chapters[chapters.length - 1];
  const percent = Math.round((completed.size / chapters.length) * 100);
  const comecando = completed.size === 0;

  return (
    <Link
      href={chapterPath(proximo.slug)}
      className="group flex flex-wrap items-center gap-4 rounded-[24px] border border-border bg-card/70 p-4 transition-all hover:border-rose/40 hover:shadow-soft sm:flex-nowrap"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-rose">
        <BookOpen className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">{comecando ? "Novata no TikTok Shop? Comece pela trilha" : "Quer revisar o básico?"}</span>
        <span className="block truncate text-[12.5px] text-muted-foreground">
          Trilha do zero · {completed.size}/{chapters.length} · próximo: {proximo.title}
        </span>
      </span>
      <span className="h-1.5 w-full overflow-hidden rounded-full bg-secondary sm:w-32">
        <span className="bg-gradient-pop block h-full rounded-full" style={{ width: `${Math.max(percent, 3)}%` }} />
      </span>
    </Link>
  );
};

const Studio = () => {
  const { user } = useAuth();
  const { completed } = useChapterProgress();
  // A área logada só monta no navegador (a guarda mostra o loader antes), então dá para ler o localStorage aqui.
  const [escolhido, setEscolhido] = useState<Modo | null>(lerModo);
  // Sem escolha salva: quem ainda não leu nenhum capítulo começa no modo "começando".
  const modo: Modo = escolhido ?? (completed.size === 0 ? "comecando" : "vendendo");
  const firstName = primeiroNome(user?.user_metadata, user?.email) || "Shop Girl";

  const escolher = (m: Modo) => {
    setEscolhido(m);
    gravarModo(m);
  };

  return (
    <div className="space-y-6 sm:space-y-7">
      <header className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">
            <Sparkles className="h-3 w-3" /> Oi, {firstName}
          </p>
          <div role="radiogroup" aria-label="Seu momento" className="inline-flex rounded-full border border-border bg-card p-1 text-[12.5px] font-semibold shadow-soft">
            {(
              [
                { id: "comecando", label: "🌱 Tô começando" },
                { id: "vendendo", label: "💸 Já vendo" },
              ] as const
            ).map((op) => (
              <button
                key={op.id}
                type="button"
                role="radio"
                aria-checked={modo === op.id}
                onClick={() => escolher(op.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 transition-all",
                  modo === op.id ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
                )}
              >
                {op.label}
              </button>
            ))}
          </div>
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[60px]">
          O que a gente vai <span className="accent-word text-gradient pr-2">vender hoje?</span>
          <span className="ml-1 inline-block rotate-12 align-top text-[0.6em]" aria-hidden="true">
            <span className="animate-floaty inline-block">🎀</span>
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {modo === "comecando"
            ? "Crie seu primeiro roteiro agora e siga a trilha do zero no seu ritmo. Uma coisa não depende da outra."
            : "Escreva o produto e saia com o roteiro pronto pra gravar: gancho, problema, solução e CTA."}
        </p>
      </header>

      <Compositor />

      {modo === "comecando" ? (
        <>
          <Trilha />
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <GanchoDoDia />
            <UltimosRoteiros />
          </section>
          <Ferramentas />
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <GanchoDoDia />
            <UltimosRoteiros />
          </section>
          <Ferramentas />
          <Trilha />
        </>
      )}
    </div>
  );
};

export default Studio;
