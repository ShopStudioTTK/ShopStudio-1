import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CartaoTiktok } from "@/components/video-embed";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { parseVideoUrl } from "@/lib/video";

/** Amostra de vídeos do TikTok sobre o produto. Roteiro salvo volta do navegador: só aceita URL do TikTok. */
const VideosRelacionados = ({ produto, videos }: { produto: string; videos?: ScriptResult["videos"] }) => {
  const lista = (videos ?? []).filter((v) => parseVideoUrl(String(v?.url ?? "")).provider === "tiktok");
  const busca = `https://www.tiktok.com/search?q=${encodeURIComponent(produto.trim())}`;
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose">Vídeos sobre esse produto</p>
      {lista.length ? (
        <>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            Uma amostra de vídeos do TikTok sobre “{produto}”, achados por um buscador. Não são necessariamente
            os mais recentes, e alguns podem estar em outro idioma.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((v) => (
              <CartaoTiktok key={v.url} {...v} />
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-[12.5px] text-muted-foreground">Não achei vídeos sobre esse produto agora.</p>
      )}
      <a
        href={busca}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/80 hover:text-foreground"
      >
        Ver os mais recentes no TikTok
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
};

type ScriptResult = {
  ganchos?: string[];
  problemas?: string[];
  solucoes?: string[];
  ctas?: string[];
  roteiro?: { gancho?: string; problema?: string; solucao?: string; cta?: string };
  hashtags?: string[];
  formatoSugerido?: string;
  videos?: { url: string; titulo: string; outraLingua: boolean }[];
};

type RoteiroSalvo = {
  id: string;
  produto: string;
  formato: string | null;
  conteudo: ScriptResult;
  created_at: string;
};

const formatos = ["Conselho de amiga", "Unboxing", "Tela verde", "Storytelling", "Música viral"];

const fields: { key: keyof ScriptResult; label: string; tone: string }[] = [
  { key: "ganchos", label: "5 ganchos", tone: "text-rose" },
  { key: "problemas", label: "5 problemas", tone: "text-foreground/50" },
  { key: "solucoes", label: "5 soluções", tone: "text-foreground/50" },
  { key: "ctas", label: "5 CTAs", tone: "text-foreground/50" },
];

export const ScriptGenerator = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [produto, setProduto] = useState("");
  const [publico, setPublico] = useState("");
  const [beneficio, setBeneficio] = useState("");
  const [formato, setFormato] = useState(formatos[0]);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [savedProduto, setSavedProduto] = useState("");

  const savedQuery = useQuery({
    queryKey: ["saved-scripts", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ roteiros: RoteiroSalvo[] }>("/api/roteiros-salvos")).roteiros,
  });

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
    },
    onError: (error: Error) => toast.error(error.message),
  });

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

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-soft sm:p-7">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="produto" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
              Produto
            </Label>
            <Input
              id="produto"
              value={produto}
              onChange={(event) => setProduto(event.target.value)}
              placeholder="Ex.: escova alisadora de cabelo"
              className="h-11 rounded-xl bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="publico" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
              Para quem
            </Label>
            <Input
              id="publico"
              value={publico}
              onChange={(event) => setPublico(event.target.value)}
              placeholder="Ex.: loiras com cabelo quebradiço"
              className="h-11 rounded-xl bg-background"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="beneficio" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
            O que muda na vida dela (opcional)
          </Label>
          <Textarea
            id="beneficio"
            value={beneficio}
            onChange={(event) => setBeneficio(event.target.value)}
            placeholder="Ex.: parou de quebrar os fios e o cabelo ficou mais encorpado"
            rows={2}
            className="rounded-xl bg-background text-[14px]"
          />
        </div>

        <div className="mt-4">
          <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Formato</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {formatos.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFormato(option)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors " +
                  (formato === option
                    ? "border-rose bg-rose-soft text-foreground"
                    : "border-border text-foreground/65 hover:border-rose/40 hover:text-foreground")
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="mt-6 w-full sm:w-auto"
          onClick={() => generate.mutate()}
          disabled={generate.isPending || produto.trim().length < 2}
        >
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {generate.isPending ? "Montando o 5×5" : "Gerar roteiro"}
        </Button>
      </section>

      {result ? (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const items = (result[field.key] as string[] | undefined) ?? [];
              return (
                <div key={field.key} className="rounded-2xl border border-border bg-card/70 p-5">
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${field.tone}`}>
                      {field.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => copy(items.join("\n"))}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={`Copiar ${field.label}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ol className="mt-3 space-y-2">
                    {items.map((item, index) => (
                      <li key={`${field.key}-${index}`} className="flex gap-2.5 text-[13.5px] leading-snug text-foreground/85">
                        <span className="font-display text-[11px] text-rose/70">{index + 1}</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>

          {result.roteiro ? (
            <div className="hero-surface relative overflow-hidden rounded-2xl p-6 text-cream">
              <div className="grain absolute inset-0 opacity-25" aria-hidden="true" />
              <div className="relative flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-rose-soft">
                  Roteiro de 30 a 60 segundos
                </p>
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      [
                        `Gancho: ${result.roteiro?.gancho ?? ""}`,
                        `Problema: ${result.roteiro?.problema ?? ""}`,
                        `Solução: ${result.roteiro?.solucao ?? ""}`,
                        `CTA: ${result.roteiro?.cta ?? ""}`,
                        result.hashtags?.length ? `Hashtags: ${result.hashtags.join(" ")}` : "",
                      ]
                        .filter(Boolean)
                        .join("\n"),
                    )
                  }
                  className="text-cream/60 transition-colors hover:text-cream"
                  aria-label="Copiar roteiro"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mt-4 space-y-3">
                {[
                  { label: "Gancho · 0–3s", text: result.roteiro.gancho },
                  { label: "Problema · até 15s", text: result.roteiro.problema },
                  { label: "Solução · até 45s", text: result.roteiro.solucao },
                  { label: "CTA · até 60s", text: result.roteiro.cta },
                ].map((part) => (
                  <div key={part.label} className="border-t border-cream/15 pt-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-cream/45">{part.label}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-cream/90">{part.text}</p>
                  </div>
                ))}
              </div>
              {result.hashtags?.length ? (
                <p className="relative mt-4 text-[12.5px] text-rose-soft">{result.hashtags.join(" ")}</p>
              ) : null}
              {result.formatoSugerido ? (
                <p className="relative mt-2 text-[12.5px] leading-relaxed text-cream/55">
                  {result.formatoSugerido}
                </p>
              ) : null}
            </div>
          ) : null}

          <VideosRelacionados produto={savedProduto || produto} videos={result.videos} />

          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={savedProduto}
              onChange={(event) => setSavedProduto(event.target.value)}
              placeholder="Nome para salvar"
              className="h-10 max-w-[240px] rounded-xl bg-card"
            />
            <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Salvar na biblioteca
            </Button>
            <Button variant="ghost" onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles className="h-3.5 w-3.5" />
              Gerar outra versão
            </Button>
          </div>
        </section>
      ) : null}

      <section>
        <p className="eyebrow">Biblioteca</p>
        {savedQuery.data?.length ? (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {savedQuery.data.map((script) => (
              <li key={script.id} className="flex items-center justify-between gap-4 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setResult(script.conteudo);
                    setSavedProduto(script.produto);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-display text-[17px] leading-snug">{script.produto}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {script.formato ?? "Roteiro"} ·{" "}
                    {new Date(script.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(script.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Excluir ${script.produto}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Seus roteiros salvos aparecem aqui. Gere o primeiro e toque em “Salvar na biblioteca”.
          </p>
        )}
      </section>
    </div>
  );
};
