"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartaoPergunta, NovaPergunta, ROTULO_ORIGEM, type Fila, type Origem, type Status } from "@/components/treinamento";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

const ABAS: { id: Status; label: string }[] = [
  { id: "pendente", label: "Pendentes" },
  { id: "respondida", label: "Respondidas" },
  { id: "descartada", label: "Descartadas" },
];

/**
 * Treinamento da IA, só para admin. A tela não decide nada: quem bloqueia é admin() no servidor,
 * em toda rota de /api/treinamento.
 */
const Treinamento = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>("pendente");
  const [origem, setOrigem] = useState<Origem | "todas">("todas");
  const [criando, setCriando] = useState(false);
  const fila = useQuery({
    queryKey: ["treinamento", status, user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<Fila>(`/api/treinamento?status=${status}`),
    retry: false,
  });

  if (fila.error?.message === "Acesso restrito à administração.") {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        Esta página é só da administração.
      </p>
    );
  }

  const conversas = origem === "todas" || origem === "aluna" ? (fila.data?.conversas ?? []) : [];
  const soltas = (fila.data?.soltas ?? []).filter((p) => origem === "todas" || p.origem === origem);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Administração</p>
          <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-5xl">
            Treinamento da <span className="accent-word">IA</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Responda do seu jeito. Quando uma aluna perguntar algo parecido, a assistente responde com o seu tom, as suas
            frases e as suas gírias.
          </p>
        </div>
        {!criando && (
          <Button variant="pop" onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" /> Nova pergunta
          </Button>
        )}
      </header>

      {criando && <NovaPergunta onFechar={() => setCriando(false)} />}

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-secondary/40 p-1.5">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setStatus(aba.id)}
            className={
              status === aba.id
                ? "rounded-xl bg-card px-3 py-2.5 text-[13.5px] font-semibold shadow-soft"
                : "rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-foreground/60 hover:text-foreground"
            }
          >
            {aba.label}
            {fila.data && <span className="ml-1.5 text-muted-foreground">{fila.data.contagem[aba.id]}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["todas", "mapeada", "aluna", "admin"] as const).map((o) => (
          <button key={o} type="button" className="chip" data-ativo={origem === o} onClick={() => setOrigem(o)}>
            {o === "todas" ? "Todas" : ROTULO_ORIGEM[o]}
          </button>
        ))}
      </div>

      {fila.isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : fila.error ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
          {fila.error.message}
        </p>
      ) : !conversas.length && !soltas.length ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">Nada por aqui.</p>
      ) : (
        <div className="space-y-4">
          {conversas.map((c) => (
            <article key={c.id} className="space-y-5 rounded-3xl border border-border bg-card p-5 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Conversa de aluna · {new Date(c.criado_em).toLocaleDateString("pt-BR")}
              </p>
              {c.perguntas.map((p, i) => (
                <div key={p.id} className={i ? "border-t border-border pt-5" : undefined}>
                  <CartaoPergunta p={p} numero={i + 1} />
                </div>
              ))}
            </article>
          ))}
          {soltas.map((p) => (
            <article key={p.id} className="rounded-3xl border border-border bg-card p-5 shadow-soft">
              <CartaoPergunta p={p} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Treinamento;
