"use client";

import { Coins } from "lucide-react";
import { useCreditos } from "@/hooks/use-creditos";
import { saldoDeCreditos, usoPorAcao, type TipoDeCredito } from "@/lib/limite";
import { cn } from "@/lib/utils";

/**
 * Perto do botão que gasta crédito: quanto a ação gasta e quanto ainda resta na semana. Perto do fim
 * (ou sem saldo), troca o saldo pelo aviso de sempre e fica rosa. Admin e carregando: nada.
 */
export const CartaoDeCredito = ({ tipo, className }: { tipo: TipoDeCredito; className?: string }) => {
  const { restantes, aviso } = useCreditos(tipo);
  if (restantes == null) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-snug",
        aviso ? "border-rose/40 bg-rose-soft/60 text-foreground" : "border-border bg-card/70 text-muted-foreground",
        className,
      )}
    >
      <Coins className="mt-px h-4 w-4 shrink-0 text-rose" aria-hidden />
      <p>
        <strong className="font-semibold text-foreground">{usoPorAcao(tipo)}</strong> {aviso ?? saldoDeCreditos(restantes)}
      </p>
    </div>
  );
};
