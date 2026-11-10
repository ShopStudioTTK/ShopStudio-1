"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { PARTES, type FichaCartao } from "@/lib/fichas-tipos";

/**
 * Cartão embaixo do roteiro com fichas da Ana: a primeira aberta, as outras numa linha com "ver".
 * O roteiro da aluna não explica nada; o porquê aparece só aqui, nas palavras dela.
 */
export const CartaoDaExpert = ({ titulo, subtitulo, fichas }: { titulo: string; subtitulo: string; fichas: FichaCartao[] }) => {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  if (!fichas.length) return null;
  const aberta = fichas.find((f) => f.id === abertaId) ?? fichas[0];

  return (
    <div className="hero-surface relative overflow-hidden rounded-[26px] p-5 text-cream shadow-editorial sm:p-6">
      <div className="grain absolute inset-0 opacity-20" aria-hidden="true" />
      <div className="relative">
        <p className="flex items-center gap-2 font-display text-lg font-semibold leading-tight">
          <Sparkles className="h-4 w-4 shrink-0" /> {titulo}
        </p>
        <p className="mt-1 text-[13px] text-cream/70">{subtitulo}</p>

        <div className="mt-4 rounded-2xl bg-white/10 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-[16px] font-semibold">{aberta.produto}</p>
            {aberta.similaridade != null && (
              <span className="text-[11.5px] text-cream/70">{Math.round(aberta.similaridade * 100)}% parecido</span>
            )}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
            <span className="rounded-full bg-cream px-2 py-0.5 text-foreground">{aberta.gatilho.rotulo}</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5">{aberta.formato}</span>
          </p>
          <dl className="mt-3 space-y-3 text-[13.5px] leading-relaxed">
            {PARTES.map(({ chave, rotulo }) => {
              const p = aberta[chave];
              return (
                <div key={chave}>
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cream/60">{rotulo}</dt>
                  <dd>
                    {p.texto}
                    {p.porque && (
                      <span className="mt-0.5 block text-cream/80">
                        <b className="font-semibold">Por quê:</b> {p.porque}
                      </span>
                    )}
                    {p.entonacao && (
                      <span className="mt-0.5 block text-cream/80">
                        <b className="font-semibold">Entonação:</b> {p.entonacao}
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {fichas.length > 1 && (
          <ul className="mt-2 space-y-1.5">
            {fichas
              .filter((f) => f.id !== aberta.id)
              .map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setAbertaId(f.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/10 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-white/15"
                  >
                    <span className="min-w-0 truncate">{f.produto}</span>
                    <span className="flex shrink-0 items-center gap-1 text-cream/70">
                      {f.similaridade != null && `${Math.round(f.similaridade * 100)}% · `}ver
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
};
