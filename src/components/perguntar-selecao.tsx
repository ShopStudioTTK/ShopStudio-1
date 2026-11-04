"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

type Alvo = { texto: string; x: number; y: number };

/** Ao selecionar um trecho dentro de `children`, mostra um botão para levar o trecho ao assistente. */
export const PerguntarSelecao = ({ slug, children }: { slug: string; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  useEffect(() => {
    const avaliar = () => {
      const sel = window.getSelection();
      const texto = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
      const dentro = sel?.anchorNode && ref.current?.contains(sel.anchorNode) && ref.current.contains(sel.focusNode);
      if (!sel || !sel.rangeCount || texto.length < 3 || !dentro) return setAlvo(null);
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setAlvo({ texto: texto.slice(0, 500), x: r.left + r.width / 2, y: r.top });
    };
    // A seleção só termina de se formar depois do mouseup.
    const aoSoltar = () => setTimeout(avaliar, 0);
    const esconder = () => setAlvo(null);
    document.addEventListener("mouseup", aoSoltar);
    document.addEventListener("touchend", aoSoltar);
    window.addEventListener("scroll", esconder, { passive: true });
    return () => {
      document.removeEventListener("mouseup", aoSoltar);
      document.removeEventListener("touchend", aoSoltar);
      window.removeEventListener("scroll", esconder);
    };
  }, []);

  return (
    <div ref={ref}>
      {children}
      {alvo ? (
        <button
          type="button"
          // mantém a seleção viva até o clique
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            router.push(`/app/assistente?capitulo=${slug}&trecho=${encodeURIComponent(alvo.texto)}`)
          }
          style={{ left: alvo.x, top: Math.max(8, alvo.y - 46) }}
          className="fixed z-50 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12.5px] font-medium text-primary-foreground shadow-soft transition-transform hover:scale-[1.03]"
        >
          <Sparkles className="h-3.5 w-3.5 text-rose" />
          Perguntar à assistente
        </button>
      ) : null}
    </div>
  );
};
