import { useMemo, useState } from "react";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  ganchos,
  hookCategorias,
  type HookCategoria,
} from "@/content/hooks";
import { cn } from "@/lib/utils";

const Highlighted = ({ text }: { text: string }) => (
  <>
    {text.split(/(\[[^\]]+\])/g).map((part, index) =>
      part.startsWith("[") && part.endsWith("]") ? (
        <span key={index} className="font-medium text-rose">
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

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ganchos.filter(
      (gancho) =>
        (categoria === "todos" || gancho.categoria === categoria) &&
        (!termo || gancho.texto.toLowerCase().includes(termo)),
    );
  }, [busca, categoria]);

  const copy = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Gancho copiado.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {ganchos.length} ganchos prontos, separados por tipo. Troque o que está entre colchetes
          pelo seu produto e fale do seu jeito — a estrutura é o que faz a pessoa parar de rolar.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoria("todos")}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
              categoria === "todos"
                ? "border-rose bg-rose-soft text-foreground"
                : "border-border text-foreground/65 hover:border-rose/40 hover:text-foreground",
            )}
          >
            Todos
          </button>
          {hookCategorias.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategoria(item.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
                categoria === item.id
                  ? "border-rose bg-rose-soft text-foreground"
                  : "border-border text-foreground/65 hover:border-rose/40 hover:text-foreground",
              )}
            >
              {item.label}
              <span className="ml-1.5 text-[11px] text-muted-foreground/80">{item.hint}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por palavra: cabelo, gaveta, preço..."
            className="h-10 rounded-xl bg-background pl-9 text-[13.5px]"
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
            className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-card/70 p-4 transition-colors hover:border-rose/40"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                {hookCategorias.find((item) => item.id === gancho.categoria)?.label}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-foreground/85">
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
