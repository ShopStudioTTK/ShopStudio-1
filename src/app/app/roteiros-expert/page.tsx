"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FORMATOS } from "@/content/formatos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { PARTES, type FichaCartao } from "@/lib/fichas-tipos";
import { cn } from "@/lib/utils";

/** 1 por linha no celular, até 4 em tela larga (com 5 ficava apertado). */
const GRADE = "grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** Um roteiro da expert: as quatro partes; "Ver o porquê" abre o porquê e a entonação de cada uma. */
const Roteiro = ({ ficha, destacada }: { ficha: FichaCartao; destacada: boolean }) => {
  const [aberto, setAberto] = useState(destacada);
  return (
    <article
      id={`ficha-${ficha.id}`}
      className={cn(
        "scroll-mt-24 rounded-[22px] border bg-card p-5 shadow-soft",
        destacada ? "border-rose ring-2 ring-rose/30" : "border-border",
      )}
    >
      <p className="font-display text-[17px] font-semibold leading-snug">{ficha.produto}</p>
      <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        <span className="rounded-full bg-rose-soft px-2.5 py-0.5 text-rose">{ficha.formato}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/70">Gatilho: {ficha.gatilho.rotulo}</span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/70">{ficha.tipo}</span>
      </p>

      <dl className="mt-4 space-y-3">
        {PARTES.map(({ chave, rotulo }) => {
          const parte = ficha[chave];
          return (
            <div key={chave}>
              <dt className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{rotulo}</dt>
              <dd className="mt-0.5 text-[13.5px] leading-relaxed text-foreground/85">{parte.texto}</dd>
              {aberto && (parte.porque || parte.entonacao) ? (
                <dd className="mt-1.5 space-y-1 rounded-xl bg-secondary/60 px-2.5 py-2 text-[12px] leading-relaxed text-foreground/75">
                  {parte.porque ? (
                    <span className="block">
                      <b className="font-semibold text-foreground">Por quê:</b> {parte.porque}
                    </span>
                  ) : null}
                  {parte.entonacao ? (
                    <span className="block">
                      <b className="font-semibold text-foreground">Entonação:</b> {parte.entonacao}
                    </span>
                  ) : null}
                </dd>
              ) : null}
            </div>
          );
        })}
      </dl>

      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose hover:underline"
      >
        {aberto ? "Esconder o porquê" : "Ver o porquê"}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", aberto && "rotate-180")} />
      </button>
    </article>
  );
};

const RoteirosExpert = () => {
  const { user } = useAuth();
  const destaque = useSearchParams().get("ficha");
  const [busca, setBusca] = useState("");
  const [formato, setFormato] = useState<string | null>(null);

  const fichasQuery = useQuery({
    queryKey: ["roteiros-expert", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ fichas: FichaCartao[] }>("/api/roteiros-expert")).fichas,
  });

  // Vindo do link do gerador (?ficha=), rola até ela, que já abre com o porquê.
  useEffect(() => {
    if (destaque && fichasQuery.data) document.getElementById(`ficha-${destaque}`)?.scrollIntoView({ block: "start" });
  }, [destaque, fichasQuery.data]);

  const termo = busca.trim().toLowerCase();
  const fichas = (fichasQuery.data ?? []).filter(
    (f) => (!formato || f.formato === formato) && (!termo || `${f.produto} ${f.tipo}`.toLowerCase().includes(termo)),
  );

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">
          <BadgeCheck className="h-3 w-3" /> Feitos pela especialista
        </p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-[52px]">
          Roteiros <span className="accent-word text-gradient pr-1">expert</span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          Os roteiros que a Ana montou, parte por parte. Leia o roteiro e, se quiser entender a escolha, toque em
          &ldquo;Ver o porquê&rdquo;.
        </p>
      </header>

      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo produto"
            aria-label="Buscar pelo produto"
            className="h-11 rounded-full bg-card pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[null, ...FORMATOS.map((f) => f.id)].map((id) => (
            <button key={id ?? "todos"} type="button" className="chip" data-ativo={formato === id} onClick={() => setFormato(id)}>
              {id ?? "Todos"}
            </button>
          ))}
        </div>
      </div>

      {fichasQuery.isLoading ? (
        <div className={GRADE}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-[22px] border border-border bg-secondary/40" />
          ))}
        </div>
      ) : fichasQuery.isError ? (
        <p className="text-[14px] text-destructive">Não consegui carregar os roteiros agora. Tente de novo.</p>
      ) : fichas.length === 0 ? (
        <p className="rounded-[22px] border border-dashed border-border bg-card/50 px-4 py-10 text-center text-[13.5px] text-muted-foreground">
          {fichasQuery.data?.length ? "Nenhum roteiro com esse filtro." : "A especialista ainda não publicou roteiros por aqui."}
        </p>
      ) : (
        <div className={GRADE}>
          {fichas.map((f) => (
            <Roteiro key={f.id} ficha={f} destacada={f.id === destaque} />
          ))}
        </div>
      )}
    </div>
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <RoteirosExpert />
  </Suspense>
);

export default Page;
