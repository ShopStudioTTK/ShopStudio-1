import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Loader2, Plus, RefreshCw, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CartaoTiktok } from "@/components/video-embed";
import { FORMATOS, FORMATO_PADRAO, SUGESTOES_DE_PRODUTO, type Formato } from "@/content/formatos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { parseVideoUrl } from "@/lib/video";
import { cn } from "@/lib/utils";

export type ScriptResult = {
  ganchos?: string[];
  problemas?: string[];
  solucoes?: string[];
  ctas?: string[];
  roteiro?: { gancho?: string; problema?: string; solucao?: string; cta?: string };
  hashtags?: string[];
  formatoSugerido?: string;
  videos?: { url: string; titulo: string; outraLingua: boolean }[];
};

export type RoteiroSalvo = {
  id: string;
  produto: string;
  formato: string | null;
  conteudo: ScriptResult;
  created_at: string;
};

/** A mesma consulta da biblioteca, usada também no Studio (início). */
export const useRoteirosSalvos = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-scripts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ roteiros: RoteiroSalvo[] }>("/api/roteiros-salvos")).roteiros,
  });
};

/** Amostra de vídeos do TikTok sobre o produto. Roteiro salvo volta do navegador: só aceita URL do TikTok. */
const VideosRelacionados = ({ produto, videos }: { produto: string; videos?: ScriptResult["videos"] }) => {
  const lista = (videos ?? []).filter((v) => parseVideoUrl(String(v?.url ?? "")).provider === "tiktok");
  const busca = `https://www.tiktok.com/search?q=${encodeURIComponent(produto.trim())}`;
  return (
    <div className="rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Pra se inspirar</p>
          <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">Vídeos sobre esse produto</p>
        </div>
        <a
          href={busca}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-rose hover:underline"
        >
          Ver os mais recentes no TikTok
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      {lista.length ? (
        <>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            Uma amostra de vídeos do TikTok sobre “{produto}”, achados por um buscador. Não são necessariamente
            os mais recentes, e alguns podem estar em outro idioma.
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((v) => (
              <CartaoTiktok key={v.url} {...v} />
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted-foreground">Não achei vídeos sobre esse produto agora.</p>
      )}
    </div>
  );
};

const fields: { key: "ganchos" | "problemas" | "solucoes" | "ctas"; label: string; sub: string; tom: string }[] = [
  { key: "ganchos", label: "Ganchos", sub: "pra parar a rolagem", tom: "bg-rose-soft text-rose" },
  { key: "problemas", label: "Problemas", sub: "a dor que ela sente", tom: "bg-lilac-soft text-lilac" },
  { key: "solucoes", label: "Soluções", sub: "o que o produto resolve", tom: "bg-mint text-foreground/70" },
  { key: "ctas", label: "CTAs", sub: "pra ela clicar no carrinho", tom: "bg-butter text-foreground/70" },
];

const etapas = [
  { key: "gancho", label: "Gancho", tempo: "0–3s" },
  { key: "problema", label: "Problema", tempo: "até 15s" },
  { key: "solucao", label: "Solução", tempo: "até 45s" },
  { key: "cta", label: "CTA", tempo: "até 60s" },
] as const;

const copiar = async (texto: string, ok = "Copiado.") => {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(ok);
  } catch {
    toast.error("Não consegui copiar.");
  }
};

/** Uma frase do 5×5: toque para copiar. */
const Frase = ({ texto, numero }: { texto: string; numero: number }) => {
  const [copiado, setCopiado] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={async () => {
          await copiar(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1400);
        }}
        className="group flex w-full items-start gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-secondary"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10.5px] font-bold text-foreground/55">
          {numero}
        </span>
        <span className="flex-1 text-[14px] leading-snug text-foreground/85">{texto}</span>
        <span className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {copiado ? <Check className="h-3.5 w-3.5 text-rose" /> : <Copy className="h-3.5 w-3.5" />}
        </span>
      </button>
    </li>
  );
};

type Props = {
  inicial?: { produto?: string; publico?: string; formato?: Formato };
  /** Veio do Studio com o produto já escrito: gera assim que abre. */
  gerarAoAbrir?: boolean;
  onGerou?: () => void;
};

export const ScriptGenerator = ({ inicial, gerarAoAbrir = false, onGerou }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [produto, setProduto] = useState(inicial?.produto ?? "");
  const [publico, setPublico] = useState(inicial?.publico ?? "");
  const [beneficio, setBeneficio] = useState("");
  const [formato, setFormato] = useState<string>(inicial?.formato ?? FORMATO_PADRAO);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [savedProduto, setSavedProduto] = useState("");
  const resultadoRef = useRef<HTMLDivElement>(null);
  const jaGerou = useRef(false);

  const savedQuery = useRoteirosSalvos();

  const generate = useMutation({
    mutationFn: async () => {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      if (!token) throw new Error("Faça login para gerar roteiros.");
      const res = await fetch("/api/roteiro", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ produto, publico, beneficio, formato }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message ?? "Não consegui gerar o roteiro.");
      return json as ScriptResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setSavedProduto(produto);
      requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!gerarAoAbrir || jaGerou.current || !user?.id || produto.trim().length < 2) return;
    jaGerou.current = true;
    generate.mutate();
    onGerou?.();
  }, [gerarAoAbrir, user?.id, produto, generate, onGerou]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id || !result) throw new Error("Gere um roteiro antes de salvar.");
      await api("/api/roteiros-salvos", {
        method: "POST",
        body: { produto: savedProduto || produto, formato, conteudo: result },
      });
    },
    onSuccess: () => {
      toast.success("Roteiro salvo na sua biblioteca.");
      void queryClient.invalidateQueries({ queryKey: ["saved-scripts", user?.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/roteiros-salvos?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-scripts", user?.id] });
    },
  });

  const podeGerar = produto.trim().length >= 2 && !generate.isPending;

  return (
    <div className="space-y-8">
      <section className="ring-gradient rounded-[30px] bg-card p-5 shadow-editorial sm:p-7">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (podeGerar) generate.mutate();
          }}
        >
          <Label htmlFor="produto" className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <span className="bg-gradient-pop flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">1</span>
            Qual produto você vai vender?
          </Label>
          <Input
            id="produto"
            value={produto}
            onChange={(event) => setProduto(event.target.value)}
            placeholder="Ex.: escova alisadora de cabelo"
            autoComplete="off"
            className="mt-2.5 h-14 rounded-2xl border-border bg-secondary/50 px-4 text-[16px] font-medium focus-visible:bg-card md:text-[16px]"
          />
          {!produto ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {SUGESTOES_DE_PRODUTO.map((s) => (
                <button key={s} type="button" onClick={() => setProduto(s)} className="chip px-3 py-1 text-[12px]">
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="publico" className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground/60">2</span>
                Pra quem?
              </Label>
              <Input
                id="publico"
                value={publico}
                onChange={(event) => setPublico(event.target.value)}
                placeholder="Ex.: loiras com cabelo quebradiço"
                className="mt-2.5 h-11 rounded-2xl bg-secondary/50 focus-visible:bg-card"
              />
            </div>
            <div>
              <Label htmlFor="beneficio" className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground/60">3</span>
                O que muda na vida dela? <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="beneficio"
                value={beneficio}
                onChange={(event) => setBeneficio(event.target.value)}
                placeholder="Ex.: parou de quebrar os fios"
                rows={1}
                className="mt-2.5 min-h-11 rounded-2xl bg-secondary/50 text-[14px] focus-visible:bg-card"
              />
            </div>
          </div>

          <p className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground/60">4</span>
            Escolha o formato
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {FORMATOS.map((option) => {
              const ativo = formato === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormato(option.id)}
                  aria-pressed={ativo}
                  title={option.dica}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all",
                    ativo
                      ? "border-rose bg-rose-soft/70 shadow-soft"
                      : "border-border bg-card hover:-translate-y-0.5 hover:border-rose/40",
                  )}
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className="text-[12.5px] font-semibold leading-tight text-foreground">{option.id}</span>
                </button>
              );
            })}
          </div>

          <Button type="submit" variant="pop" size="lg" className="mt-7 w-full sm:w-auto" disabled={!podeGerar}>
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generate.isPending ? "Escrevendo seu roteiro…" : "Criar meu roteiro"}
          </Button>
        </form>
      </section>

      {generate.isPending && !result ? (
        <div className="space-y-4" aria-live="polite">
          <div className="hero-surface h-56 animate-pulse rounded-[28px] opacity-80" />
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className="h-44 animate-pulse rounded-[24px] border border-border bg-card" />
            ))}
          </div>
          <p className="text-center text-[13px] text-muted-foreground">Montando gancho, problema, solução e CTA…</p>
        </div>
      ) : null}

      {result ? (
        <section ref={resultadoRef} className="scroll-mt-24 space-y-5">
          {result.roteiro ? (
            <div className="hero-surface relative overflow-hidden rounded-[30px] p-6 text-cream shadow-editorial sm:p-8">
              <div className="grain absolute inset-0 opacity-20" aria-hidden="true" />
              <div
                className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-60 blur-[70px]"
                style={{ background: "radial-gradient(circle, hsl(var(--gold) / 0.7), transparent 70%)" }}
                aria-hidden="true"
              />
              <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    <Sparkles className="h-3 w-3" /> Roteiro pronto · 30 a 60s
                  </p>
                  <h2 className="mt-3 font-display text-[28px] font-semibold leading-[1.05] tracking-tight sm:text-[34px]">
                    {savedProduto || produto}
                  </h2>
                </div>
                <Button
                  variant="cream"
                  size="sm"
                  onClick={() =>
                    copiar(
                      [
                        `Gancho: ${result.roteiro?.gancho ?? ""}`,
                        `Problema: ${result.roteiro?.problema ?? ""}`,
                        `Solução: ${result.roteiro?.solucao ?? ""}`,
                        `CTA: ${result.roteiro?.cta ?? ""}`,
                        result.hashtags?.length ? `Hashtags: ${result.hashtags.join(" ")}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n"),
                      "Roteiro copiado.",
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar roteiro
                </Button>
              </div>

              <ol className="relative mt-6 space-y-3">
                {etapas.map((etapa, i) => (
                  <li key={etapa.key} className="flex gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream font-display text-sm font-bold text-rose">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cream/65">
                        {etapa.label} · {etapa.tempo}
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-cream">{result.roteiro?.[etapa.key]}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {result.hashtags?.length ? (
                <div className="relative mt-5 flex flex-wrap gap-1.5">
                  {result.hashtags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {result.formatoSugerido ? (
                <p className="relative mt-4 text-[13px] leading-relaxed text-cream/75">🎬 {result.formatoSugerido}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="eyebrow">Exercício 5×5</p>
                <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">
                  Mais opções pra misturar e testar
                </p>
              </div>
              <p className="text-[12px] text-muted-foreground">Toque numa frase para copiar</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const items = result[field.key] ?? [];
                return (
                  <div key={field.key} className="rounded-[24px] border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
                      <span className={cn("rounded-full px-3 py-1 text-[12px] font-bold", field.tom)}>
                        5 {field.label}
                        <span className="ml-1.5 font-medium opacity-75">{field.sub}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => copiar(items.join("\n"))}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Copiar os 5 ${field.label}`}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ol>
                      {items.map((item, index) => (
                        <Frase key={`${field.key}-${index}`} texto={item} numero={index + 1} />
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass sticky bottom-24 z-20 flex flex-wrap items-center gap-2 rounded-[22px] border border-border p-2.5 shadow-editorial lg:bottom-4">
            <Input
              value={savedProduto}
              onChange={(event) => setSavedProduto(event.target.value)}
              placeholder="Nome para salvar"
              aria-label="Nome para salvar"
              className="h-10 min-w-0 flex-1 rounded-full bg-card sm:max-w-[260px]"
            />
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Salvar
            </Button>
            <Button variant="ghost" onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Outra versão
            </Button>
          </div>

          <VideosRelacionados produto={savedProduto || produto} videos={result.videos} />
        </section>
      ) : null}

      <section id="biblioteca" className="scroll-mt-24">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Biblioteca</p>
            <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">Seus roteiros salvos</p>
          </div>
          {savedQuery.data?.length ? (
            <span className="text-[12px] text-muted-foreground">{savedQuery.data.length} salvos</span>
          ) : null}
        </div>
        {savedQuery.data?.length ? (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedQuery.data.map((script) => (
              <li key={script.id} className="group relative rounded-[22px] border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-rose/40 hover:shadow-soft">
                <button
                  type="button"
                  onClick={() => {
                    setResult(script.conteudo);
                    setSavedProduto(script.produto);
                    if (script.formato) setFormato(script.formato);
                    requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }}
                  className="block w-full pr-7 text-left"
                >
                  <span className="rounded-full bg-rose-soft px-2.5 py-0.5 text-[11px] font-semibold text-rose">
                    {script.formato ?? "Roteiro"}
                  </span>
                  <p className="mt-2.5 truncate font-display text-[17px] font-semibold leading-snug">{script.produto}</p>
                  {script.conteudo?.roteiro?.gancho ? (
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
                      “{script.conteudo.roteiro.gancho}”
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11.5px] text-muted-foreground/80">
                    {new Date(script.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(script.id)}
                  className="absolute right-3 top-3 text-muted-foreground opacity-60 transition-all hover:text-destructive group-hover:opacity-100"
                  aria-label={`Excluir ${script.produto}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-[22px] border border-dashed border-border bg-card/50 px-4 py-8 text-center text-[13px] text-muted-foreground">
            Seus roteiros salvos aparecem aqui. Gere o primeiro e toque em “Salvar”.
          </p>
        )}
      </section>
    </div>
  );
};
