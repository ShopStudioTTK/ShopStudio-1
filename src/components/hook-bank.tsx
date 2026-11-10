import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Pencil, Plus, Search, Star, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConteudoCarregando } from "@/components/conteudo-carregando";
import { hookCategorias, type Gancho, type HookCategoria } from "@/content/hooks";
import { useAccess } from "@/hooks/use-access";
import { useGanchos } from "@/hooks/use-ganchos";
import { api } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";

const MAX = 200;

const Highlighted = ({ text }: { text: string }) => (
  <>
    {text.split(/(\[[^\]]+\])/g).map((part, index) =>
      part.startsWith("[") && part.endsWith("]") ? (
        <span key={index} className="rounded-md bg-rose-soft/70 px-1 font-semibold text-rose">
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    )}
  </>
);

const tagDaCategoria = (categoria: HookCategoria) =>
  cn(
    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
    categoria === "quebra" && "bg-rose-soft text-rose",
    categoria === "problema" && "bg-lilac-soft text-lilac",
    categoria === "curiosidade" && "bg-butter text-foreground/70",
  );

const EscolherCategoria = ({ valor, mudar }: { valor: HookCategoria | null; mudar: (c: HookCategoria) => void }) => (
  <div role="radiogroup" aria-label="Tipo do gancho" className="flex flex-wrap gap-2">
    {hookCategorias.map((item) => (
      <button
        key={item.id}
        type="button"
        role="radio"
        aria-checked={valor === item.id}
        onClick={() => mudar(item.id)}
        data-ativo={valor === item.id}
        className="chip"
      >
        {item.label}
      </button>
    ))}
  </div>
);

const useInvalidar = () => {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["ganchos"] });
};

/** Nota de 1 a 5 da aluna logada, com a média de todas ao lado. */
const Estrelas = ({ gancho }: { gancho: Gancho }) => {
  const invalidar = useInvalidar();
  const [hover, setHover] = useState(0);
  const dar = useMutation({
    mutationFn: (nota: number) => api("/api/ganchos/nota", { method: "POST", body: { id: gancho.id, nota } }),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });
  const marcada = hover || (dar.isPending ? (dar.variables ?? 0) : (gancho.minhaNota ?? 0));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => dar.mutate(n)}
            onMouseEnter={() => setHover(n)}
            disabled={dar.isPending}
            aria-label={`Dar nota ${n} de 5`}
            aria-pressed={gancho.minhaNota === n}
            className="p-0.5 text-gold transition-transform hover:scale-110 disabled:opacity-60"
          >
            <Star className={cn("h-4 w-4", n <= marcada ? "fill-current" : "fill-transparent text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <span className="text-[11.5px] text-muted-foreground">
        {gancho.media === null
          ? "Sem notas ainda"
          : `${gancho.media.toLocaleString("pt-BR")} · ${gancho.notas} ${gancho.notas === 1 ? "nota" : "notas"}`}
      </span>
    </div>
  );
};

/** Só admin: editar e apagar. Quem bloqueia de verdade é admin() em PATCH/DELETE /api/ganchos. */
const EditarGancho = ({ gancho, fechar }: { gancho: Gancho; fechar: () => void }) => {
  const invalidar = useInvalidar();
  const [categoria, setCategoria] = useState<HookCategoria>(gancho.categoria);
  const [texto, setTexto] = useState(gancho.texto);
  const salvar = useMutation({
    mutationFn: () => api("/api/ganchos", { method: "PATCH", body: { id: gancho.id, categoria, texto } }),
    onSuccess: () => {
      toast.success("Gancho atualizado.");
      invalidar();
      fechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate();
      }}
      className="space-y-3"
    >
      <EscolherCategoria valor={categoria} mudar={setCategoria} />
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAX}
        aria-label="Texto do gancho"
        className="min-h-[72px] rounded-2xl bg-secondary/40 text-[14px]"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={fechar}>
          <X className="h-3.5 w-3.5" /> Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={salvar.isPending || texto.trim().length < 5}>
          {salvar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Salvar
        </Button>
      </div>
    </form>
  );
};

const ApagarGancho = ({ gancho }: { gancho: Gancho }) => {
  const invalidar = useInvalidar();
  const [confirmando, setConfirmando] = useState(false);
  const apagar = useMutation({
    mutationFn: () => api(`/api/ganchos?id=${gancho.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Gancho apagado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!confirmando)
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Apagar gancho"
        title="Apagar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  return (
    <span className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => apagar.mutate()} disabled={apagar.isPending}>
        {apagar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        Apagar
      </Button>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setConfirmando(false)}>
        Não
      </Button>
    </span>
  );
};

const CartaoGancho = ({ gancho, isAdmin }: { gancho: Gancho; isAdmin: boolean }) => {
  const [editando, setEditando] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(gancho.texto);
      toast.success("Gancho copiado.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-[22px] border border-border bg-card p-4 transition-all hover:border-rose/40 hover:shadow-soft">
      {editando ? (
        <EditarGancho gancho={gancho} fechar={() => setEditando(false)} />
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <span className={tagDaCategoria(gancho.categoria)}>
              {hookCategorias.find((item) => item.id === gancho.categoria)?.label}
            </span>
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Editar gancho"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <ApagarGancho gancho={gancho} />
                </>
              ) : null}
              <button
                type="button"
                onClick={copiar}
                className="text-muted-foreground opacity-60 transition-all hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                aria-label={`Copiar gancho: ${gancho.texto}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="flex-1 font-display text-[16.5px] font-medium leading-snug tracking-tight text-foreground/90">
            <Highlighted text={gancho.texto} />
          </p>
          <Estrelas gancho={gancho} />
        </>
      )}
    </div>
  );
};

/** A aluna registra um gancho dela; aparece para todas em "Ganchos da comunidade". */
const NovoGancho = ({ fechar }: { fechar: () => void }) => {
  const invalidar = useInvalidar();
  const [categoria, setCategoria] = useState<HookCategoria | null>(null);
  const [texto, setTexto] = useState("");
  const publicar = useMutation({
    mutationFn: () => api("/api/ganchos", { method: "POST", body: { categoria, texto } }),
    onSuccess: () => {
      toast.success("Gancho publicado na comunidade.");
      invalidar();
      fechar();
      document.getElementById("comunidade")?.scrollIntoView({ behavior: "smooth" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!categoria) return toast.error("Escolha o tipo do gancho.");
    if (texto.trim().length < 5) return toast.error("Escreva o gancho inteiro.");
    publicar.mutate();
  };

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-[22px] border border-dashed border-rose/40 bg-rose-soft/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-semibold">Compartilhe um gancho que funcionou pra você</p>
        <button type="button" onClick={fechar} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAX}
        placeholder="Ex.: Eu não acreditei até testar [PRODUTO] na frente de vocês…"
        aria-label="Seu gancho"
        autoFocus
        className="min-h-[72px] rounded-2xl bg-card text-[14px]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11.5px] font-medium text-muted-foreground">Qual é o tipo?</p>
          <EscolherCategoria valor={categoria} mudar={setCategoria} />
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-[11px]", texto.length >= MAX ? "text-destructive" : "text-muted-foreground")}>
            {texto.length}/{MAX}
          </span>
          <Button type="submit" disabled={publicar.isPending}>
            {publicar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Publicar
          </Button>
        </div>
      </div>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Aparece para todas as alunas, sem o seu nome. Troque o nome do produto por [PRODUTO] e não coloque dados pessoais.
      </p>
    </form>
  );
};

const Grade = ({ lista, isAdmin }: { lista: Gancho[]; isAdmin: boolean }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {lista.map((gancho) => (
      <CartaoGancho key={gancho.id} gancho={gancho} isAdmin={isAdmin} />
    ))}
  </div>
);

export const HookBank = () => {
  const [categoria, setCategoria] = useState<HookCategoria | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [melhores, setMelhores] = useState(false);
  const [criando, setCriando] = useState(false);
  const { data: ganchos, error, refetch } = useGanchos();
  const { isAdmin } = useAccess();

  const [doStudio, daComunidade] = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = (ganchos ?? []).filter(
      (gancho) =>
        (categoria === "todos" || gancho.categoria === categoria) &&
        (!termo || gancho.texto.toLowerCase().includes(termo)),
    );
    if (melhores) lista.sort((a, b) => (b.media ?? 0) - (a.media ?? 0) || b.notas - a.notas);
    return [lista.filter((g) => !g.comunidade), lista.filter((g) => g.comunidade)];
  }, [busca, categoria, ganchos, melhores]);

  if (!ganchos) return <ConteudoCarregando erro={error} tentar={() => void refetch()} />;

  return (
    <section className="space-y-6">
      {criando ? (
        <NovoGancho fechar={() => setCriando(false)} />
      ) : (
        <Button variant="pop" onClick={() => setCriando(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Registrar meu gancho
        </Button>
      )}

      <div className="rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          Troque o que está entre colchetes pelo seu produto e fale do seu jeito: a estrutura é o que faz a
          pessoa parar de rolar. Dê nota aos que você testou para as outras saberem quais funcionam.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setCategoria("todos")} data-ativo={categoria === "todos"} className="chip">
            Todos
          </button>
          {hookCategorias.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategoria(item.id)}
              data-ativo={categoria === item.id}
              className="chip"
            >
              {item.label}
              <span className={cn("text-[11px] font-normal", categoria === item.id ? "opacity-60" : "text-muted-foreground/80")}>
                {item.hint}
              </span>
            </button>
          ))}
          <button type="button" onClick={() => setMelhores((v) => !v)} data-ativo={melhores} className="chip">
            <Star className="h-3 w-3" /> Mais bem avaliados
          </button>
          <a href="#comunidade" className="chip">
            <Users className="h-3 w-3" /> Da comunidade ({daComunidade.length})
          </a>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por palavra: cabelo, gaveta, preço..."
            className="h-11 rounded-full bg-secondary/50 pl-9 text-[13.5px] focus-visible:bg-card"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold tracking-tight">Banco do Studio</h2>
          <span className="text-[12px] text-muted-foreground">
            {doStudio.length} {doStudio.length === 1 ? "gancho" : "ganchos"}
          </span>
        </div>
        {doStudio.length ? (
          <Grade lista={doStudio} isAdmin={isAdmin} />
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            Nenhum gancho com esse filtro. Tente algo mais curto, tipo “cabelo”.
          </p>
        )}
      </div>

      <div id="comunidade" className="scroll-mt-24 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-[22px] font-semibold tracking-tight">
            <Users className="h-5 w-5 text-rose" /> Ganchos da comunidade
          </h2>
          <span className="text-[12px] text-muted-foreground">
            {daComunidade.length} {daComunidade.length === 1 ? "gancho" : "ganchos"}
          </span>
        </div>
        {daComunidade.length ? (
          <Grade lista={daComunidade} isAdmin={isAdmin} />
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
            {busca || categoria !== "todos" ? "Nenhum gancho da comunidade com esse filtro." : "Ninguém publicou ainda. Seja a primeira!"}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Dica do capítulo 10: o gancho precisa caber em 2 a 5 segundos. Se você não consegue falar a frase
          inteira nesse tempo, corte. O resto vira texto na tela.
        </p>
      </div>
    </section>
  );
};
