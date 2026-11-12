"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { BadgeCheck, ChevronDown, Lightbulb, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FORMATOS } from "@/content/formatos";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { PARTES, type FichaCartao } from "@/lib/fichas-tipos";
import { cn } from "@/lib/utils";

/** Sempre 2 por linha (no celular, 1): o cartão mostra o roteiro inteiro e o porquê abre em destaque. */
const GRADE = "grid items-start gap-4 sm:grid-cols-2";

const Etiquetas = ({ ficha }: { ficha: FichaCartao }) => (
  <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
    <span className="rounded-full bg-rose-soft px-2.5 py-0.5 text-rose">{ficha.formato}</span>
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/70">Gatilho: {ficha.gatilho.rotulo}</span>
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground/70">{ficha.tipo}</span>
  </p>
);

const ROTULO_PORQUE = "Por que funciona?";

const temPorque = (ficha: FichaCartao) => PARTES.some(({ chave }) => ficha[chave].porque || ficha[chave].entonacao);

/**
 * O roteiro inteiro, parte por parte.
 * - No cartão (`onVerPorque`): o porquê não abre ali, para não esticar a grade. Com mouse, um véu rosa
 *   cobre o cartão ao passar o mouse, com "Por que funciona?" no centro; no toque, o botão fica no fim.
 *   O clique abre o cartão em destaque no pop-up, já com o porquê. O pai precisa ser `group relative`.
 * - No pop-up (sem `onVerPorque`): o porquê e a entonação aparecem e somem ali mesmo.
 */
const Roteiro = ({
  ficha,
  comPorque,
  onVerPorque,
}: {
  ficha: FichaCartao;
  comPorque: boolean;
  onVerPorque?: () => void;
}) => {
  const [aberto, setAberto] = useState(comPorque && !onVerPorque);
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
      {!temPorque(ficha) ? null : onVerPorque ? (
        <>
          {/* Com mouse: véu em degradê rosa sobre o cartão inteiro, botão no centro. */}
          <button
            type="button"
            onClick={onVerPorque}
            aria-label={`${ROTULO_PORQUE} Abrir o roteiro em destaque com o motivo de cada parte`}
            className="veu-porque absolute inset-0 z-10 hidden items-center justify-center rounded-[inherit] opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:flex"
          >
            <span className="bg-gradient-pop shadow-glow inline-flex translate-y-1 items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold text-primary-foreground transition-transform duration-300 group-hover:translate-y-0">
              <Lightbulb className="h-4 w-4" />
              {ROTULO_PORQUE}
            </span>
          </button>
          {/* Toque (sem hover): o botão fica à vista no fim do cartão. */}
          <button
            type="button"
            onClick={onVerPorque}
            className="bg-gradient-pop mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-primary-foreground [@media(hover:hover)]:hidden"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {ROTULO_PORQUE}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-rose hover:underline"
        >
          {aberto ? "Esconder o porquê" : ROTULO_PORQUE}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", aberto && "rotate-180")} />
        </button>
      )}
    </>
  );
};

const RoteirosExpert = () => {
  const { user } = useAuth();
  const destaque = useSearchParams().get("ficha");
  const [busca, setBusca] = useState("");
  const [formato, setFormato] = useState<string | null>(null);
  // Ficha aberta em destaque no pop-up; vindo do link do gerador (?ficha=), já abre nela com o porquê.
  const [abertaId, setAbertaId] = useState<string | null>(destaque);
  const [abertaComPorque, setAbertaComPorque] = useState(Boolean(destaque));
  const abrir = (id: string, comPorque: boolean) => {
    setAbertaComPorque(comPorque);
    setAbertaId(id);
  };

  const fichasQuery = useQuery({
    queryKey: ["roteiros-expert", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ fichas: FichaCartao[] }>("/api/roteiros-expert")).fichas,
  });

  // O link do gerador abre a ficha em destaque; atrás, a grade já rola até ela.
  useEffect(() => {
    if (destaque && fichasQuery.data) document.getElementById(`ficha-${destaque}`)?.scrollIntoView({ block: "start" });
  }, [destaque, fichasQuery.data]);

  const termo = busca.trim().toLowerCase();
  const fichas = (fichasQuery.data ?? []).filter(
    (f) => (!formato || f.formato === formato) && (!termo || `${f.produto} ${f.tipo}`.toLowerCase().includes(termo)),
  );
  const aberta = fichasQuery.data?.find((f) => f.id === abertaId);

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
          &ldquo;Por que funciona?&rdquo;.
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
            <article
              key={f.id}
              id={`ficha-${f.id}`}
              className={cn(
                "group relative scroll-mt-24 rounded-[22px] border bg-card p-5 shadow-soft",
                f.id === destaque ? "border-rose ring-2 ring-rose/30" : "border-border",
              )}
            >
              <p className="font-display text-[17px] font-semibold leading-snug">{f.produto}</p>
              <Etiquetas ficha={f} />
              <Roteiro ficha={f} comPorque={false} onVerPorque={() => abrir(f.id, true)} />
            </article>
          ))}
        </div>
      )}

      <Dialog.Root open={Boolean(aberta)} onOpenChange={(abrir) => !abrir && setAbertaId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/45 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[26px] border border-border bg-card p-6 shadow-editorial">
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
                {/* key: trocar de ficha recomeça o porquê */}
                <Roteiro key={aberta.id} ficha={aberta} comPorque={abertaComPorque} />
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
