"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PreviaDoRoteiro, type ScriptResult } from "@/components/script-generator";
import { FORMATOS, FORMATO_PADRAO } from "@/content/formatos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { PARTES, type FichaCartao, type Gatilho, type Parte } from "@/lib/fichas-tipos";

type FichaAdmin = FichaCartao & { indexada: boolean };
type ChaveParte = (typeof PARTES)[number]["chave"];
type Rascunho = { id?: string; produto: string; tipo: string; formato: string; gatilho: string; exemploFixo: boolean } & Record<ChaveParte, Parte>;

const MAX_PARTE = 500;
const parteVazia = (): Parte => ({ texto: "", porque: "", entonacao: "" });
const novo = (): Rascunho => ({
  produto: "",
  tipo: "",
  formato: FORMATOS[0].id,
  gatilho: "",
  exemploFixo: false,
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
  exemploFixo: f.exemploFixo ?? false,
  ...Object.fromEntries(
    PARTES.map(({ chave }) => [chave, { texto: f[chave].texto, porque: f[chave].porque ?? "", entonacao: f[chave].entonacao ?? "" }]),
  ),
}) as Rascunho;

type Pedido = { produto: string; publico: string; beneficio: string; formato: string };

/** Rascunho da IA → ficha preenchida: o roteiro pronto, o gatilho, o tipo, o porquê e a entonação. */
const deRascunho = (p: Pedido, res: ScriptResult): Rascunho =>
  ({
    produto: p.produto.trim().slice(0, 120),
    tipo: (res.tipo ?? "").slice(0, 120),
    formato: p.formato,
    gatilho: res.gatilho ?? "",
    exemploFixo: false,
    ...Object.fromEntries(
      PARTES.map(({ chave }) => [
        chave,
        { texto: res.roteiro?.[chave] ?? "", porque: res.explicacao?.[chave]?.porque ?? "", entonacao: res.explicacao?.[chave]?.entonacao ?? "" },
      ]),
    ),
  }) as Rascunho;

/** A prévia com as mudanças da admin: o roteiro pronto é o do formulário, e no 5×5 só a frase escolhida troca. */
const comEdicoes = (res: ScriptResult, r: Rascunho): ScriptResult => {
  const troca = (lista: string[] | undefined, chave: ChaveParte) =>
    lista?.map((t) => (t === res.roteiro?.[chave] ? r[chave].texto : t));
  return {
    ...res,
    roteiro: { gancho: r.gancho.texto, problema: r.problema.texto, solucao: r.solucao.texto, cta: r.cta.texto },
    ganchos: troca(res.ganchos, "gancho"),
    problemas: troca(res.problemas, "problema"),
    solucoes: troca(res.solucoes, "solucao"),
    ctas: troca(res.ctas, "cta"),
  };
};

const TITULO = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <label className="block space-y-1.5">
    <span className={TITULO}>{rotulo}</span>
    {children}
  </label>
);

/** Grupo de chips: <div>, não <label>, senão clicar no título escolhe o primeiro chip. */
const Grupo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <div role="group" aria-label={rotulo} className="space-y-1.5">
    <span className={`block ${TITULO}`}>{rotulo}</span>
    {children}
  </div>
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

const Formulario = ({
  inicial,
  gatilhos,
  previa,
  onFechar,
}: {
  inicial: Rascunho;
  gatilhos: Gatilho[];
  /** Resposta do gerador, quando a ficha nasceu de um rascunho: mostra como a aluna veria. */
  previa?: ScriptResult;
  onFechar: () => void;
}) => {
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
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{r.id ? "Editar ficha" : previa ? "Corrija o rascunho" : "Nova ficha"}</h2>
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

        <Grupo rotulo="Formato">
          <div className="flex flex-wrap gap-2">
            {FORMATOS.map((f) => (
              <button key={f.id} type="button" className="chip" data-ativo={r.formato === f.id} onClick={() => setR({ ...r, formato: f.id })}>
                {f.emoji} {f.id}
              </button>
            ))}
          </div>
        </Grupo>

        {PARTES.map(({ chave, rotulo }) => (
          <fieldset key={chave} className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
            <legend className="px-1 font-display text-[15px] font-semibold">{rotulo}</legend>
            {chave === "gancho" && (
              <Grupo rotulo="Gatilho">
                <div className="flex flex-wrap items-center gap-2">
                  {gatilhos.map((g) => (
                    <button key={g.slug} type="button" className="chip" data-ativo={r.gatilho === g.slug} onClick={() => setR({ ...r, gatilho: g.slug })}>
                      {g.rotulo}
                    </button>
                  ))}
                  <NovoGatilho onCriado={(slug) => setR((atual) => ({ ...atual, gatilho: slug }))} />
                </div>
              </Grupo>
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

        <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-border bg-secondary/40 p-3 text-[13px]">
          <input
            type="checkbox"
            checked={r.exemploFixo}
            onChange={(e) => setR({ ...r, exemploFixo: e.target.checked })}
            className="mt-0.5 h-4 w-4 accent-[hsl(var(--rose))]"
          />
          <span>
            <b className="font-semibold">Exemplo fixo de voz</b>
            <span className="block text-muted-foreground">
              Entra em todo roteiro gerado como modelo do jeito da Ana falar (até 6 fichas), além das parecidas com o produto.
            </span>
          </span>
        </label>

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
      {previa && (
        <section className="space-y-4">
          <div>
            <p className="eyebrow">Prévia</p>
            <p className="mt-1.5 font-display text-xl font-semibold tracking-tight">Como a aluna vê</p>
          </div>
          <PreviaDoRoteiro titulo={r.produto} result={comEdicoes(previa, r)} formato={r.formato} />
        </section>
      )}
    </div>
  );
};

/** "Nova ficha": a IA escreve o rascunho (como o roteiro da aluna, com porquê e entonação) e a admin corrige. */
const GeradorDeRascunho = ({
  temRascunho,
  onGerou,
  onFechar,
}: {
  temRascunho: boolean;
  onGerou: (r: Rascunho, res: ScriptResult) => void;
  onFechar: () => void;
}) => {
  const [p, setP] = useState<Pedido>({ produto: "", publico: "", beneficio: "", formato: FORMATO_PADRAO });
  const [confirmando, setConfirmando] = useState(false);
  const gerar = useMutation({
    mutationFn: () => api<ScriptResult>("/api/roteiro", { method: "POST", body: { ...p, rascunho: true } }),
    onSuccess: (res) => {
      setConfirmando(false);
      onGerou(deRascunho(p, res), res);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const podeGerar = p.produto.trim().length >= 2 && !gerar.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!podeGerar) return;
        if (temRascunho && !confirmando) setConfirmando(true);
        else gerar.mutate();
      }}
      className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Nova ficha</h2>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="text-[13.5px] text-muted-foreground">
        A IA escreve o roteiro como faz para as alunas, já com o porquê e a entonação. Você corrige o que quiser e salva.
      </p>

      <Campo rotulo="Produto">
        <Input required maxLength={120} value={p.produto} onChange={(e) => setP({ ...p, produto: e.target.value })} placeholder="Sérum facial de vitamina C" className="h-11 rounded-xl bg-background" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Pra quem? (opcional)">
          <Input maxLength={500} value={p.publico} onChange={(e) => setP({ ...p, publico: e.target.value })} placeholder="mulheres com pele oleosa" className="h-11 rounded-xl bg-background" />
        </Campo>
        <Campo rotulo="O que muda na vida dela? (opcional)">
          <Input maxLength={500} value={p.beneficio} onChange={(e) => setP({ ...p, beneficio: e.target.value })} placeholder="pele sem brilho o dia todo" className="h-11 rounded-xl bg-background" />
        </Campo>
      </div>
      <Grupo rotulo="Formato">
        <div className="flex flex-wrap gap-2">
          {FORMATOS.map((f) => (
            <button key={f.id} type="button" className="chip" data-ativo={p.formato === f.id} onClick={() => setP({ ...p, formato: f.id })}>
              {f.emoji} {f.id}
            </button>
          ))}
        </div>
      </Grupo>

      {confirmando && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-destructive/5 p-3 text-[13px]">
          Isso troca o rascunho abaixo, e o que você mudou nele se perde.
          <Button type="submit" size="sm" variant="destructive" disabled={gerar.isPending}>
            Trocar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="pop" disabled={!podeGerar || confirmando}>
          {gerar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {gerar.isPending ? "Escrevendo o rascunho…" : temRascunho ? "Gerar outra versão" : "Gerar rascunho"}
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
          {f.exemploFixo && <span className="chip border-rose/40 text-rose">Exemplo fixo</span>}
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
  const [gerando, setGerando] = useState(false);
  // versao troca a key do formulário: cada rascunho novo começa do zero.
  const [previa, setPrevia] = useState<{ res: ScriptResult; versao: number } | null>(null);
  const abrir = (r: Rascunho | null, comGerador = false) => {
    setEditando(r);
    setGerando(comGerador);
    setPrevia(null);
  };
  const fichas = useQuery({
    queryKey: ["fichas", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<{ fichas: FichaAdmin[] }>("/api/fichas"),
    retry: false,
  });
  const queryClient = useQueryClient();
  const reindexar = useMutation({
    mutationFn: () => api<{ total: number; indexadas: number }>("/api/fichas/reindexar", { method: "POST" }),
    onSuccess: ({ total, indexadas }) => {
      void queryClient.invalidateQueries({ queryKey: ["fichas"] });
      if (indexadas === total) toast.success(`${total} fichas reindexadas.`);
      else toast.warning(`${indexadas} de ${total} fichas reindexadas. Tente de novo para as que faltaram.`);
    },
    onError: (e: Error) => toast.error(e.message),
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
      {gerando && (
        <GeradorDeRascunho
          temRascunho={Boolean(previa)}
          onGerou={(r, res) => {
            setEditando(r);
            setPrevia((v) => ({ res, versao: (v?.versao ?? 0) + 1 }));
          }}
          onFechar={() => abrir(null)}
        />
      )}
      {editando ? (
        <Formulario
          key={previa ? `rascunho-${previa.versao}` : (editando.id ?? "nova")}
          inicial={editando}
          previa={previa?.res}
          gatilhos={gatilhos.data?.gatilhos ?? []}
          onFechar={() => abrir(null)}
        />
      ) : (
        !gerando && (
          <div className="flex flex-wrap gap-2">
            <Button variant="pop" onClick={() => abrir(null, true)}>
              <Plus className="h-4 w-4" /> Nova ficha
            </Button>
            <Button variant="outline" onClick={() => abrir(novo())}>
              <Pencil className="h-4 w-4" /> Escrever do zero
            </Button>
            <Button
              variant="ghost"
              disabled={reindexar.isPending}
              onClick={() => reindexar.mutate()}
              title="Refaz a busca de produtos parecidos de todas as fichas (necessário uma vez depois da mudança para minúsculas)"
            >
              {reindexar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reindexar fichas
            </Button>
          </div>
        )
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
            <CartaoFicha key={f.id} f={f} onEditar={() => abrir(deFicha(f))} />
          ))}
        </div>
      )}
    </div>
  );
};
