"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { PARTES, porQueAparece, type FichaCartao } from "@/lib/fichas-tipos";

/**
 * Cartão embaixo do roteiro com fichas da Ana: a primeira aberta, as outras numa linha com "ver".
 * O roteiro da aluna não explica nada; o porquê aparece só aqui, nas palavras dela.
 * Dropdown nativo (<details>): vem aberto e a aluna fecha pelo título. As etiquetas dizem o que a ficha
 * tem em comum com o roteiro dela; os links abrem a página "Roteiros expert" em outra aba (o roteiro
 * gerado continua aqui).
 */
export const CartaoDaExpert = ({
  titulo,
  subtitulo,
  fichas,
  formato,
  gatilho,
}: {
  titulo: string;
  subtitulo: string;
  fichas: FichaCartao[];
  /** Formato e gatilho do roteiro da aluna, para as etiquetas. */
  formato: string;
  gatilho: string;
}) => {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  if (!fichas.length) return null;
  const aberta = fichas.find((f) => f.id === abertaId) ?? fichas[0];

  return (
    <details open className="group hero-surface relative overflow-hidden rounded-[26px] p-5 text-cream shadow-editorial sm:p-6">
      <div className="grain pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
      <summary className="relative flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="flex items-center gap-2 font-display text-lg font-semibold leading-tight">
            <Sparkles className="h-4 w-4 shrink-0" /> {titulo}
          </span>
          <span className="mt-1 block text-[13px] text-cream/70">{subtitulo}</span>
        </span>
        <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-cream/80 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="relative">

        <div className="mt-4 rounded-2xl bg-white/10 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-[16px] font-semibold">{aberta.produto}</p>
            <Link
              href={`/app/roteiros-expert?ficha=${aberta.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-cream/80 hover:text-cream hover:underline"
            >
              Abrir na página <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {/* o que esta ficha tem em comum com o roteiro dela */}
          <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
            {porQueAparece(aberta, formato, gatilho).map((motivo) => (
              <span key={motivo} className="rounded-full bg-cream px-2 py-0.5 text-foreground">
                {motivo}
              </span>
            ))}
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
                      {porQueAparece(f, formato, gatilho)[0]} · ver
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}

        <Link
          href="/app/roteiros-expert"
          target="_blank"
          className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-cream/85 hover:text-cream hover:underline"
        >
          Ver todos os roteiros expert <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </details>
  );
};
