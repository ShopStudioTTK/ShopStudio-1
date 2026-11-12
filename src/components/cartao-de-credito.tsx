"use client";

import { Coins, Sparkles, Wand2 } from "lucide-react";
import { useCreditos } from "@/hooks/use-creditos";
import { LIMITE_SEMANAL, saldoDeCreditos, usoPorAcao, type TipoDeCredito } from "@/lib/limite";
import { cn } from "@/lib/utils";

const ILIMITADO = "Sua conta é admin: créditos ilimitados.";

/**
 * Perto do botão que gasta crédito: quanto a ação gasta e quanto ainda resta na semana, com o número
 * grande à direita. Perto do fim (ou sem saldo), troca o saldo pelo aviso de sempre e fica rosa forte.
 * Admin vê o mesmo cartão, com "ilimitado". Carregando: nada.
 */
export const CartaoDeCredito = ({ tipo, className }: { tipo: TipoDeCredito; className?: string }) => {
  const { restantes, aviso, ilimitado } = useCreditos(tipo);
  if (restantes == null && !ilimitado) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 pr-4",
        aviso ? "border-rose bg-rose-soft" : "border-rose/30 bg-rose-soft/50",
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-rose shadow-soft">
        <Coins className="h-4 w-4" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        <strong className="block text-[14px] font-semibold text-foreground">{usoPorAcao(tipo)}</strong>
        <span className={aviso ? "font-medium text-rose" : "text-muted-foreground"}>
          {ilimitado ? ILIMITADO : (aviso ?? saldoDeCreditos(restantes!))}
        </span>
      </p>
      <span className="shrink-0 text-right leading-none" aria-hidden>
        <span className={cn("block font-display text-[28px] font-semibold", aviso ? "text-rose" : "text-foreground")}>
          {ilimitado ? "∞" : restantes}
        </span>
        {!ilimitado && <span className="text-[11px] text-muted-foreground">de {LIMITE_SEMANAL[tipo]}</span>}
      </span>
    </div>
  );
};

/** Contador ao lado do logo: perguntas e roteiros que restam na semana (admin: ∞). */
export const ContadorDeCreditos = ({
  empilhado,
  comNomes,
  className,
}: {
  empilhado?: boolean;
  /** "12 perguntas · 5 roteiros" no lugar de só os ícones (menu largo). */
  comNomes?: boolean;
  className?: string;
}) => {
  const perguntas = useCreditos("assistente");
  const roteiros = useCreditos("roteiro");
  if (perguntas.restantes == null && !perguntas.ilimitado) return null;
  const itens = [
    { nome: "perguntas", icone: Sparkles, c: perguntas },
    { nome: "roteiros", icone: Wand2, c: roteiros },
  ];
  const rotulo = perguntas.ilimitado
    ? "Créditos ilimitados (admin)"
    : `Créditos da semana: ${perguntas.restantes} perguntas e ${roteiros.restantes} roteiros`;
  return (
    <div
      title={rotulo}
      aria-label={rotulo}
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] font-semibold shadow-soft",
        empilhado && "flex-col gap-0.5 rounded-2xl px-2 py-1.5",
        className,
      )}
    >
      {itens.map(({ nome, icone: Icone, c }) => (
        <span key={nome} className={cn("inline-flex items-center gap-1", c.aviso ? "text-rose" : "text-foreground")} aria-hidden>
          <Icone className="h-3.5 w-3.5 text-rose" />
          {c.ilimitado ? "∞" : c.restantes}
          {comNomes && <span className="font-medium text-muted-foreground">{nome}</span>}
        </span>
      ))}
    </div>
  );
};
