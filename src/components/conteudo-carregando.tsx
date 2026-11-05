import { Button } from "@/components/ui/button";

/** Enquanto o conteúdo pago chega de /api/conteudo: linhas de carregamento, ou o erro com "Tentar de novo". */
export const ConteudoCarregando = ({ erro, tentar }: { erro: Error | null; tentar: () => void }) =>
  erro ? (
    <div className="rounded-2xl border border-border bg-card/70 p-5 text-[14px] text-muted-foreground">
      <p>{erro.message}</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={tentar}>
        Tentar de novo
      </Button>
    </div>
  ) : (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      {[100, 92, 96, 70].map((w) => (
        <div key={w} className="h-4 animate-pulse rounded-full bg-secondary" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
