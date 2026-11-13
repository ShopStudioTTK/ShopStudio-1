"use client";

import Link from "next/link";
import { ArrowRight, Coins, Sparkles, Wand2 } from "lucide-react";
import { useCreditos } from "@/hooks/use-creditos";
import { LIMITE_SEMANAL, saldoDeCreditos, usoPorAcao, type TipoDeCredito } from "@/lib/limite";
import { cn } from "@/lib/utils";

const ILIMITADO = "Sua conta é admin: créditos ilimitados.";

/**
 * Perto do botão que gasta crédito: quanto a ação gasta e quanto ainda resta (da semana + comprados),
 * com o número grande à direita. Perto do fim (ou sem saldo), troca o saldo pelo aviso de sempre,
 * fica rosa forte e mostra a CTA para comprar mais (/app/creditos). Admin vê "ilimitado". Carregando: nada.
 */
export const CartaoDeCredito = ({ tipo, className }: { tipo: TipoDeCredito; className?: string }) => {
  const { restantes, comprados, aviso, ilimitado } = useCreditos(tipo);
  if (restantes == null && !ilimitado) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border p-3 pr-4",
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
          {ilimitado ? ILIMITADO : (aviso ?? saldoDeCreditos(restantes!, comprados))}
        </span>
      </p>
      <span className="shrink-0 text-right leading-none" aria-hidden>
        <span className={cn("block font-display text-[28px] font-semibold", aviso ? "text-rose" : "text-foreground")}>
          {ilimitado ? "∞" : restantes! + comprados}
        </span>
        {!ilimitado && (
          <span className="text-[11px] text-muted-foreground">
            {comprados > 0 ? "com os comprados" : `de ${LIMITE_SEMANAL[tipo]}`}
          </span>
        )}
      </span>
      {aviso && (
        <Link
          href="/app/creditos"
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-pop px-4 py-2 text-[13px] font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Comprar mais créditos <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
};

/** Contador ao lado do logo: perguntas e roteiros que restam, da semana + comprados (admin: ∞). Leva à página Créditos. */
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
  const total = (c: typeof perguntas) => (c.restantes ?? 0) + c.comprados;
  const rotulo = perguntas.ilimitado
    ? "Créditos ilimitados (admin)"
    : `Seus créditos: ${total(perguntas)} perguntas e ${total(roteiros)} roteiros. Ver os créditos`;
  return (
    <Link
      href="/app/creditos"
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12.5px] font-semibold shadow-soft transition-colors hover:border-rose/50",
        empilhado && "flex-col gap-0.5 rounded-2xl px-2 py-1.5",
        className,
      )}
    >
      {itens.map(({ nome, icone: Icone, c }) => (
        <span key={nome} className={cn("inline-flex items-center gap-1", c.aviso ? "text-rose" : "text-foreground")} aria-hidden>
          <Icone className="h-3.5 w-3.5 text-rose" />
          {c.ilimitado ? "∞" : total(c)}
          {comNomes && <span className="font-medium text-muted-foreground">{nome}</span>}
        </span>
      ))}
    </Link>
  );
};
