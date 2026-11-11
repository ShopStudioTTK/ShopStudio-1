"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { BadgeCheck, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FORMATOS } from "@/content/formatos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { abreEmPopup, colunasDaGrade, PARTES, type FichaCartao } from "@/lib/fichas-tipos";
import { cn } from "@/lib/utils";

/** No celular é sempre 1 por linha; a escolha da aluna vale a partir de sm. */
const GRADES = {
  1: "mx-auto max-w-2xl",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
} as const;
const CHAVE_COLUNAS = "shopstudio:roteiros-expert-colunas";
/** O mesmo `xl` da grade: só a partir dele cabem 4 por linha. */
const TELA_LARGA = "(min-width: 1280px)";

const useTelaLarga = () =>
  useSyncExternalStore(
    (avisar) => {
      const m = matchMedia(TELA_LARGA);
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => matchMedia(TELA_LARGA).matches,
    () => true,
  );

const Etiquetas = ({ ficha }: { ficha: FichaCartao }) => (
  <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
    <span className="rounded-full bg-rose-soft px-2.5 py-0.5 text-rose">{ficha.formato}</span>
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/70">Gatilho: {ficha.gatilho.rotulo}</span>
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/70">{ficha.tipo}</span>
  </p>
);

/** O roteiro inteiro; "Ver o porquê" abre o porquê e a entonação de cada parte. No cartão (até 3 por linha) e no pop-up. */
const Roteiro = ({ ficha, comPorque }: { ficha: FichaCartao; comPorque: boolean }) => {
  const [aberto, setAberto] = useState(comPorque);
  return (
    <>
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
    </>
  );
};

const RoteirosExpert = () => {
  const { user } = useAuth();
  const destaque = useSearchParams().get("ficha");
  const [busca, setBusca] = useState("");
  const [formato, setFormato] = useState<string | null>(null);
  // Conveniência de cada aluna, só no navegador dela. A guarda só monta a página no navegador.
  const [colunas, setColunas] = useState(() => {
    try {
      return colunasDaGrade(localStorage.getItem(CHAVE_COLUNAS));
    } catch {
      return colunasDaGrade(null);
    }
  });
  const emPopup = abreEmPopup(colunas, useTelaLarga());
  // Ficha aberta no pop-up; vindo do link do gerador (?ficha=), já abre nela.
  const [abertaId, setAbertaId] = useState<string | null>(destaque);

  const escolherColunas = (n: 1 | 2 | 3 | 4) => {
    setColunas(n);
    try {
      localStorage.setItem(CHAVE_COLUNAS, String(n));
    } catch {
      // armazenamento bloqueado: vale só nesta visita
    }
  };

  const fichasQuery = useQuery({
    queryKey: ["roteiros-expert", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ fichas: FichaCartao[] }>("/api/roteiros-expert")).fichas,
  });

  // Sem pop-up, o link do gerador rola até a ficha, que já vem destacada e com o porquê.
  useEffect(() => {
    if (!emPopup && destaque && fichasQuery.data)
      document.getElementById(`ficha-${destaque}`)?.scrollIntoView({ block: "start" });
  }, [emPopup, destaque, fichasQuery.data]);

  const termo = busca.trim().toLowerCase();
  const fichas = (fichasQuery.data ?? []).filter(
    (f) => (!formato || f.formato === formato) && (!termo || `${f.produto} ${f.tipo}`.toLowerCase().includes(termo)),
  );
  const aberta = emPopup ? fichasQuery.data?.find((f) => f.id === abertaId) : undefined;

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo produto"
              aria-label="Buscar pelo produto"
              className="h-11 rounded-full bg-card pl-10"
            />
          </div>
          {/* no celular é sempre 1 por linha */}
          <div className="hidden items-center gap-2 sm:flex" role="group" aria-label="Roteiros por linha">
            <span className="text-[12px] font-medium text-muted-foreground">Por linha</span>
            {([1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                className="chip h-8 w-8 justify-center px-0"
                data-ativo={colunas === n}
                aria-pressed={colunas === n}
                aria-label={`${n} por linha`}
                onClick={() => escolherColunas(n)}
              >
                {n}
              </button>
            ))}
          </div>
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
        <div className={cn("grid items-start gap-4", GRADES[colunas])}>
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
        <div className={cn("grid items-start gap-4", GRADES[colunas])}>
          {fichas.map((f) => (
            <article
              key={f.id}
              id={`ficha-${f.id}`}
              className={cn(
                "scroll-mt-24 rounded-[22px] border bg-card p-5 shadow-soft",
                f.id === destaque ? "border-rose ring-2 ring-rose/30" : "border-border",
              )}
            >
              <p className="font-display text-[17px] font-semibold leading-snug">{f.produto}</p>
              <Etiquetas ficha={f} />
              {emPopup ? (
                // mais de 3 por linha: só o gancho, e o roteiro inteiro abre no pop-up
                <>
                  <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Gancho</p>
                  <p className="mt-0.5 line-clamp-3 text-[13.5px] leading-relaxed text-foreground/85">{f.gancho.texto}</p>
                  <button
                    type="button"
                    onClick={() => setAbertaId(f.id)}
                    className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose hover:underline"
                  >
                    Ver o roteiro
                  </button>
                </>
              ) : (
                <Roteiro ficha={f} comPorque={f.id === destaque} />
              )}
            </article>
          ))}
        </div>
      )}

      <Dialog.Root open={Boolean(aberta)} onOpenChange={(abrir) => !abrir && setAbertaId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[26px] border border-border bg-card p-6 shadow-editorial">
            {aberta ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <Dialog.Title className="font-display text-xl font-semibold leading-snug">{aberta.produto}</Dialog.Title>
                  <Dialog.Close
                    aria-label="Fechar"
                    className="-mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">Roteiro da especialista, parte por parte.</Dialog.Description>
                <Etiquetas ficha={aberta} />
                {/* key: trocar de ficha recomeça o "Ver o porquê" */}
                <Roteiro key={aberta.id} ficha={aberta} comPorque={aberta.id === destaque} />
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

const Page = () => (
  <Suspense fallback={null}>
    <RoteirosExpert />
  </Suspense>
);

export default Page;
