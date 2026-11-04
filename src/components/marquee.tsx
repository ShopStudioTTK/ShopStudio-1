import { Sparkle } from "@/components/brand";

const frases = [
  "vídeo todo dia, mesmo com preguiça",
  "gancho nos 3 primeiros segundos",
  "indica como se fosse para uma amiga",
  "produto do link é o produto do vídeo",
  "3 produtos × 5 formatos = 15 testes",
  "comissão acima de R$ 3 vale o esforço",
  "constância vence talento",
];

export const Marquee = () => {
  const conteudo = [...frases, ...frases];

  return (
    <div className="relative w-full max-w-full overflow-hidden border-y border-border bg-secondary/40 py-3">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
        {conteudo.map((frase, index) => (
          <span key={`${frase}-${index}`} className="flex items-center gap-8">
            <span className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
              {frase}
            </span>
            <Sparkle className="h-2.5 w-2.5 text-rose/70" />
          </span>
        ))}
      </div>
    </div>
  );
};
