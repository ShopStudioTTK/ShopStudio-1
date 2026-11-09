import { useMemo, useState } from "react";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ConteudoCarregando } from "@/components/conteudo-carregando";
import { hookCategorias, type HookCategoria } from "@/content/hooks";
import { useConteudo } from "@/hooks/use-conteudo";
import { cn } from "@/lib/utils";

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

export const HookBank = () => {
  const [categoria, setCategoria] = useState<HookCategoria | "todos">("todos");
  const [busca, setBusca] = useState("");
  const { data: ganchos, error, refetch } = useConteudo("ganchos");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (ganchos ?? []).filter(
      (gancho) =>
        (categoria === "todos" || gancho.categoria === categoria) &&
        (!termo || gancho.texto.toLowerCase().includes(termo)),
    );
  }, [busca, categoria, ganchos]);

  const copy = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Gancho copiado.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  if (!ganchos) return <ConteudoCarregando erro={error} tentar={() => void refetch()} />;

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <p className="text-[13.5px] leading-relaxed text-muted-foreground">
          {ganchos.length} ganchos prontos, separados por tipo. Troque o que está entre colchetes
          pelo seu produto e fale do seu jeito — a estrutura é o que faz a pessoa parar de rolar.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoria("todos")}
            data-ativo={categoria === "todos"}
            className="chip"
          >
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

      <div className="flex items-center justify-between text-[12px] text-muted-foreground">
        <span>
          {lista.length} {lista.length === 1 ? "gancho" : "ganchos"}
        </span>
        <span>
          {hookCategorias.find((item) => item.id === categoria)?.hint ?? "Todas as categorias"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {lista.map((gancho) => (
          <div
            key={gancho.id}
            className="group flex items-start justify-between gap-3 rounded-[22px] border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-rose/40 hover:shadow-soft"
          >
            <div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  gancho.categoria === "quebra" && "bg-rose-soft text-rose",
                  gancho.categoria === "problema" && "bg-lilac-soft text-lilac",
                  gancho.categoria === "curiosidade" && "bg-butter text-foreground/70",
                )}
              >
                {hookCategorias.find((item) => item.id === gancho.categoria)?.label}
              </span>
              <p className="mt-2.5 text-[14px] leading-relaxed text-foreground/85">
                <Highlighted text={gancho.texto} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(gancho.texto)}
              className="mt-0.5 shrink-0 text-muted-foreground opacity-60 transition-all hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Copiar gancho: ${gancho.texto}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
          Nenhum gancho com essa palavra. Tente algo mais curto, tipo “cabelo”.
        </p>
      ) : null}

      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Dica do capítulo 10: o gancho precisa caber em 2 a 5 segundos. Se você não consegue falar
          a frase inteira nesse tempo, corte — o resto vira texto na tela.
        </p>
      </div>
    </section>
  );
};
