"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FORMATOS } from "@/content/formatos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { PARTES, type FichaCartao, type Gatilho, type Parte } from "@/lib/fichas-tipos";

type FichaAdmin = FichaCartao & { indexada: boolean };
type ChaveParte = (typeof PARTES)[number]["chave"];
type Rascunho = { id?: string; produto: string; tipo: string; formato: string; gatilho: string } & Record<ChaveParte, Parte>;

const MAX_PARTE = 500;
const parteVazia = (): Parte => ({ texto: "", porque: "", entonacao: "" });
const novo = (): Rascunho => ({
  produto: "",
  tipo: "",
  formato: FORMATOS[0].id,
  gatilho: "",
  gancho: parteVazia(),
  problema: parteVazia(),
  solucao: parteVazia(),
  cta: parteVazia(),
});
const deFicha = (f: FichaAdmin): Rascunho => ({
  id: f.id,
  produto: f.produto,
  tipo: f.tipo,
  formato: f.formato,
  gatilho: f.gatilho.slug,
  ...Object.fromEntries(
    PARTES.map(({ chave }) => [chave, { texto: f[chave].texto, porque: f[chave].porque ?? "", entonacao: f[chave].entonacao ?? "" }]),
  ),
}) as Rascunho;

const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <label className="block space-y-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{rotulo}</span>
    {children}
  </label>
);

const Texto = ({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <Textarea
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className="rounded-xl bg-background text-[14px]"
    />
    <p className={`mt-1 text-right text-[11px] ${valor.length > MAX_PARTE ? "text-destructive" : "text-muted-foreground"}`}>
      {valor.length}/{MAX_PARTE}
    </p>
  </div>
);

/** "+" ao lado dos gatilhos: cria um gatilho novo e já o escolhe. */
const NovoGatilho = ({ onCriado }: { onCriado: (slug: string) => void }) => {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [rotulo, setRotulo] = useState("");
  const criar = useMutation({
    mutationFn: () => api<{ gatilho: Gatilho }>("/api/gatilhos", { method: "POST", body: { rotulo } }),
    onSuccess: ({ gatilho }) => {
      void queryClient.invalidateQueries({ queryKey: ["gatilhos"] });
      onCriado(gatilho.slug);
      setRotulo("");
      setAberto(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!aberto)
    return (
      <button type="button" className="chip" onClick={() => setAberto(true)} aria-label="Novo gatilho" title="Novo gatilho">
        <Plus className="h-3.5 w-3.5" />
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      <Input
        autoFocus
        value={rotulo}
        maxLength={40}
        onChange={(e) => setRotulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (rotulo.trim()) criar.mutate();
          }
        }}
        placeholder="Nome do gatilho"
        className="h-8 w-44 rounded-full bg-background text-[13px]"
      />
      <Button type="button" size="sm" variant="rose" disabled={!rotulo.trim() || criar.isPending} onClick={() => criar.mutate()}>
        {criar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
      </Button>
      <button type="button" onClick={() => setAberto(false)} aria-label="Cancelar" className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </span>
  );
};

const Formulario = ({ inicial, gatilhos, onFechar }: { inicial: Rascunho; gatilhos: Gatilho[]; onFechar: () => void }) => {
  const queryClient = useQueryClient();
  const [r, setR] = useState(inicial);
  const parte = (chave: ChaveParte, campo: keyof Parte, valor: string) =>
    setR((atual) => ({ ...atual, [chave]: { ...atual[chave], [campo]: valor } }));
  const salvar = useMutation({
    mutationFn: () =>
      api<{ id: string; indexada: boolean }>("/api/fichas", { method: r.id ? "PATCH" : "POST", body: r }),
    onSuccess: ({ indexada }) => {
      void queryClient.invalidateQueries({ queryKey: ["fichas"] });
      if (indexada) toast.success("Ficha salva.");
      else toast.warning("Ficha salva, mas não indexada: ela não aparece nos produtos parecidos. Edite de novo mais tarde.");
      onFechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const longo = PARTES.some(({ chave }) => Object.values(r[chave]).some((v) => (v ?? "").length > MAX_PARTE));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate();
      }}
      className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{r.id ? "Editar ficha" : "Nova ficha"}</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Produto">
          <Input required maxLength={120} value={r.produto} onChange={(e) => setR({ ...r, produto: e.target.value })} placeholder="Sérum facial de vitamina C" className="h-11 rounded-xl bg-background" />
        </Campo>
        <Campo rotulo="Tipo de produto">
          <Input required maxLength={120} value={r.tipo} onChange={(e) => setR({ ...r, tipo: e.target.value })} placeholder="skincare" className="h-11 rounded-xl bg-background" />
        </Campo>
      </div>

      <Campo rotulo="Formato">
        <div className="flex flex-wrap gap-2">
          {FORMATOS.map((f) => (
            <button key={f.id} type="button" className="chip" data-ativo={r.formato === f.id} onClick={() => setR({ ...r, formato: f.id })}>
              {f.emoji} {f.id}
            </button>
          ))}
        </div>
      </Campo>

      {PARTES.map(({ chave, rotulo }) => (
        <fieldset key={chave} className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
          <legend className="px-1 font-display text-[15px] font-semibold">{rotulo}</legend>
          {chave === "gancho" && (
            <Campo rotulo="Gatilho">
              <div className="flex flex-wrap items-center gap-2">
                {gatilhos.map((g) => (
                  <button key={g.slug} type="button" className="chip" data-ativo={r.gatilho === g.slug} onClick={() => setR({ ...r, gatilho: g.slug })}>
                    {g.rotulo}
                  </button>
                ))}
                <NovoGatilho onCriado={(slug) => setR((atual) => ({ ...atual, gatilho: slug }))} />
              </div>
            </Campo>
          )}
          <Campo rotulo="Texto">
            <Texto valor={r[chave].texto} onChange={(v) => parte(chave, "texto", v)} />
          </Campo>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo={chave === "gancho" ? "Por quê" : "Por quê (opcional)"}>
              <Texto valor={r[chave].porque ?? ""} onChange={(v) => parte(chave, "porque", v)} placeholder="Por que esse caminho para esse produto" />
            </Campo>
            <Campo rotulo={chave === "gancho" ? "Entonação" : "Entonação (opcional)"}>
              <Texto valor={r[chave].entonacao ?? ""} onChange={(v) => parte(chave, "entonacao", v)} placeholder="Como falar esse trecho" />
            </Campo>
          </div>
        </fieldset>
      ))}

      <div className="flex gap-2">
        <Button type="submit" variant="pop" disabled={salvar.isPending || longo || !r.gatilho}>
          {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar ficha
        </Button>
        <Button type="button" variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

const CartaoFicha = ({ f, onEditar }: { f: FichaAdmin; onEditar: () => void }) => {
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const apagar = useMutation({
    mutationFn: () => api(`/api/fichas?id=${f.id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fichas"] });
      toast.success("Ficha apagada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">{f.produto}</h3>
          <p className="text-[13px] text-muted-foreground">
            {f.tipo} · {f.formato}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="chip" data-ativo="true">
            {f.gatilho.rotulo}
          </span>
          <button type="button" onClick={onEditar} aria-label="Editar ficha" className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setConfirmando(true)} aria-label="Apagar ficha" className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed">“{f.gancho.texto}”</p>
      {!f.indexada && (
        <p className="mt-2 text-[12.5px] text-destructive">Não indexada: não aparece nos produtos parecidos. Edite e salve de novo.</p>
      )}
      {confirmando && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-destructive/5 p-3 text-[13px]">
          Apagar esta ficha?
          <Button size="sm" variant="destructive" disabled={apagar.isPending} onClick={() => apagar.mutate()}>
            Apagar
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </article>
  );
};

/** Aba "Roteiros" do treinamento: fichas de como a expert pensaria o roteiro de um produto. */
export const FichasRoteiro = () => {
  const { user } = useAuth();
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const fichas = useQuery({
    queryKey: ["fichas", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<{ fichas: FichaAdmin[] }>("/api/fichas"),
    retry: false,
  });
  const gatilhos = useQuery({
    queryKey: ["gatilhos", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<{ gatilhos: Gatilho[] }>("/api/gatilhos"),
    retry: false,
  });

  if (fichas.error?.message === "Acesso restrito à administração.") {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">Esta página é só da administração.</p>
    );
  }

  return (
    <div className="space-y-6">
      {editando ? (
        <Formulario key={editando.id ?? "nova"} inicial={editando} gatilhos={gatilhos.data?.gatilhos ?? []} onFechar={() => setEditando(null)} />
      ) : (
        <Button variant="pop" onClick={() => setEditando(novo())}>
          <Plus className="h-4 w-4" /> Nova ficha
        </Button>
      )}

      {fichas.isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : fichas.error ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">{fichas.error.message}</p>
      ) : !fichas.data?.fichas.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Nenhuma ficha ainda. Comece por um produto que você já vendeu.
        </p>
      ) : (
        <div className="space-y-4">
          {fichas.data.fichas.map((f) => (
            <CartaoFicha key={f.id} f={f} onEditar={() => setEditando(deFicha(f))} />
          ))}
        </div>
      )}
    </div>
  );
};
