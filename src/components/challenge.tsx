import { useState } from "react";
import { Check, ChevronDown, ClipboardCopy, Flame, Instagram, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useChecklistProgress } from "@/hooks/use-progress";
import { DESAFIO_MARCA, desafioDias, desafioLegenda } from "@/content/challenge";
import { cn } from "@/lib/utils";

const key = (dia: number) => `desafio-${dia}`;

export const Challenge = () => {
  const { isDone, toggle } = useChecklistProgress();
  const [aberto, setAberto] = useState<number | null>(1);
  const feitos = desafioDias.filter((dia) => isDone(key(dia.dia))).length;
  const percent = Math.round((feitos / desafioDias.length) * 100);

  const copyLegenda = async () => {
    try {
      await navigator.clipboard.writeText(desafioLegenda);
      toast.success("Legenda copiada.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="hero-surface relative overflow-hidden rounded-3xl p-6 text-cream sm:p-7">
        <div className="grain absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-soft">
              <Flame className="h-3 w-3" />
              Desafio 7 dias
            </p>
            <p className="mt-3 font-display text-3xl leading-tight">
              Um vídeo por dia. Sete dias seguidos.
            </p>
            <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-cream/65">
              A meta não é viralizar: é criar hábito e ter vídeos suficientes para descobrir o que
              funciona no seu perfil. Marque {DESAFIO_MARCA} em cada post.
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl leading-none">
              {feitos}
              <span className="text-base text-cream/50">/7</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-cream/45">dias postados</p>
          </div>
        </div>
        <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-cream/15">
          <div
            className="h-full rounded-full bg-rose transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="relative mt-5 flex flex-wrap gap-2">
          <Button variant="cream" size="sm" onClick={copyLegenda}>
            <ClipboardCopy className="h-3.5 w-3.5" />
            Copiar legenda
          </Button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cream/20 px-3 py-1.5 text-[11.5px] text-cream/60">
            <Instagram className="h-3 w-3" />
            marque {DESAFIO_MARCA}
          </span>
        </div>
      </div>

      <ol className="space-y-3">
        {desafioDias.map((dia) => {
          const done = isDone(key(dia.dia));
          const expandido = aberto === dia.dia;
          return (
            <li
              key={dia.dia}
              className={cn(
                "rounded-2xl border bg-card/70 transition-colors",
                done ? "border-rose/40 bg-rose-soft/25" : "border-border",
              )}
            >
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-sm",
                    done
                      ? "border-rose bg-rose text-primary-foreground"
                      : "border-foreground/15 text-foreground/60",
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : dia.dia}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setAberto(expandido ? null : dia.dia)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                        Dia {dia.dia}
                      </span>
                      <span className="mt-0.5 block font-display text-[18px] leading-snug">
                        {dia.titulo}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "mt-1.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        expandido && "rotate-180",
                      )}
                    />
                  </button>

                  {expandido ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-[13.5px] leading-relaxed text-foreground/80">
                        {dia.tarefa}
                      </p>
                      <div className="rounded-xl bg-secondary/60 px-3.5 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose">
                          O que postar
                        </p>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/80">
                          {dia.post}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={done ? "secondary" : "default"}
                        onClick={() => toggle(key(dia.dia), !done)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {done ? "Dia concluído" : "Postei hoje"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-rose" />
          Se travar no meio
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          Volte ao capítulo 10 e escreva 5 ganchos antes de ligar a câmera. Um dia perdido não
          reinicia o desafio: retome de onde parou.
        </p>
      </div>
    </div>
  );
};
