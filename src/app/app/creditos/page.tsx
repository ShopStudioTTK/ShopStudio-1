"use client";

import { Clock, RotateCcw, Sparkles, Wand2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaldo } from "@/hooks/use-creditos";
import { LIMITE_SEMANAL, PACOTES, PRECO_AVULSO, precoDoPacote, reais, type Pacote, type TipoDeCredito } from "@/lib/limite";
import { cn } from "@/lib/utils";

const TIPOS: { tipo: TipoDeCredito; titulo: string; icone: LucideIcon; nome: [string, string] }[] = [
  { tipo: "assistente", titulo: "Perguntas", icone: Sparkles, nome: ["pergunta", "perguntas"] },
  { tipo: "roteiro", titulo: "Roteiros", icone: Wand2, nome: ["roteiro", "roteiros"] },
];
const quantos = (n: number, [um, varios]: [string, string]) => `${n} ${n === 1 ? um : varios}`;

/** O que cada pacote resolve, na língua da aluna. */
const PARA_QUE: Record<string, string> = {
  "combo-pro": "Para quem posta todo dia: 20 vídeos prontos para gravar e dúvidas de sobra.",
  "combo-criador": "10 vídeos prontos para gravar e algumas perguntas para ajustar o caminho.",
  "roteiros-5": "5 vídeos prontos para gravar, com gancho, roteiro e CTA.",
  "perguntas-10": "Para tirar dúvidas de produto, gancho e métrica sem esperar o domingo.",
};

/** Mostra até isso de bolinhas compradas; o resto vira "+N". */
const MAX_COMPRADAS = 8;

/** Uma bolinha por crédito, na ordem em que são gastos: os da semana e depois os comprados. */
const Fila = ({ tipo, semana, comprados }: { tipo: TipoDeCredito; semana: number; comprados: number }) => {
  const visiveis = Math.min(comprados, MAX_COMPRADAS);
  return (
    <div className="flex flex-wrap items-center gap-1" aria-hidden>
      {Array.from({ length: LIMITE_SEMANAL[tipo] }, (_, i) => (
        <span
          key={`s${i}`}
          className={cn("h-2.5 w-2.5 rounded-full", i < semana ? "bg-rose" : "border border-foreground/15")}
        />
      ))}
      {visiveis > 0 && <span className="mx-1 h-3.5 w-px bg-foreground/20" />}
      {Array.from({ length: visiveis }, (_, i) => (
        <span key={`c${i}`} className="h-2.5 w-2.5 rounded-[3px] bg-foreground" />
      ))}
      {comprados > visiveis && (
        <span className="ml-1 text-[11px] font-semibold text-foreground/70">+{comprados - visiveis}</span>
      )}
    </div>
  );
};

const Saldo = () => {
  const saldo = useSaldo();
  const dados = saldo.data;
  const vencimento = dados?.vencimento ? new Date(dados.vencimento).toLocaleDateString("pt-BR") : null;

  return (
    <section aria-labelledby="saldo" className="rounded-3xl border border-border bg-card/80 p-5 shadow-soft sm:p-6">
      <h2 id="saldo" className="eyebrow">
        Seu saldo agora
      </h2>
      {dados?.ilimitado ? (
        <p className="mt-3 text-[15px] text-muted-foreground">Sua conta é de admin: os créditos são ilimitados.</p>
      ) : saldo.isError ? (
        <p className="mt-3 text-[15px] text-muted-foreground">
          Não consegui ler seus créditos agora. Recarregue a página daqui a pouco.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-4">
            {TIPOS.map(({ tipo, titulo, icone: Icone, nome }) => {
              const semana = dados?.restantes?.[tipo];
              const comprados = dados?.comprados?.[tipo] ?? 0;
              return (
                <li key={tipo}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-[14px] font-semibold">
                      <Icone className="h-4 w-4 text-rose" /> {titulo}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {semana == null ? (
                        "…"
                      ) : (
                        <>
                          <strong className="font-display text-xl font-semibold text-foreground">
                            {semana + comprados}
                          </strong>{" "}
                          {semana + comprados === 1 ? "restante" : "restantes"}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Fila tipo={tipo} semana={semana ?? 0} comprados={comprados} />
                  </div>
                  {semana != null && (
                    <p className="sr-only">
                      {quantos(semana, nome)} da semana e {quantos(comprados, nome)} comprados.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose" /> da semana, renova no domingo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-foreground" /> comprados, usados depois
            </span>
          </div>
          {vencimento && (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Os comprados que vencem primeiro valem até <strong className="text-foreground">{vencimento}</strong>.
            </p>
          )}
        </>
      )}
    </section>
  );
};

/** "R$ 18,00" com os reais grandes e os centavos pequenos, como em etiqueta de loja. */
const Preco = ({ valor, escuro, pequeno }: { valor: number; escuro?: boolean; pequeno?: boolean }) => {
  const [inteiro, centavos] = valor.toFixed(2).split(".");
  return (
    <p className="flex items-start font-display font-semibold leading-none tracking-[-0.04em]">
      <span className="sr-only">{reais(valor)}</span>
      <span
        aria-hidden
        className={cn(pequeno ? "mr-0.5 mt-1 text-sm" : "mr-1 mt-2 text-lg", escuro ? "text-background/70" : "text-muted-foreground")}
      >
        R$
      </span>
      <span aria-hidden className={pequeno ? "text-[40px]" : "text-[64px]"}>
        {inteiro}
      </span>
      <span aria-hidden className={pequeno ? "mt-1 text-lg" : "mt-2 text-2xl"}>
        ,{centavos}
      </span>
    </p>
  );
};

const conteudo = (p: Pacote) =>
  TIPOS.filter(({ tipo }) => p[tipo] > 0)
    .map(({ tipo, nome }) => quantos(p[tipo], nome))
    .join(" + ");

/** Combo: o que queremos vender. O primeiro (Pro) é escuro; o outro tem a borda rosa. */
const Combo = ({ pacote, escuro }: { pacote: Pacote; escuro: boolean }) => {
  const { cheio, preco } = precoDoPacote(pacote);
  const fraco = escuro ? "text-background/70" : "text-muted-foreground";
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl p-6 sm:p-7",
        escuro ? "bg-foreground text-background shadow-editorial" : "ring-gradient bg-card shadow-soft",
      )}
    >
      {pacote.selo && (
        <span
          className={cn(
            "absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
            escuro ? "bg-gradient-pop text-white shadow-glow" : "bg-rose-soft text-rose",
          )}
        >
          {pacote.selo}
        </span>
      )}
      <h3 className="font-display text-[28px] font-semibold leading-none tracking-[-0.03em]">{pacote.nome}</h3>
      <p className="mt-2 text-[15px] font-semibold">{conteudo(pacote)}</p>
      <p className={cn("mt-1.5 text-[14px] leading-relaxed", fraco)}>{PARA_QUE[pacote.id]}</p>
      <div className="mt-6">
        <p className={cn("mb-1 text-[14px]", fraco)}>
          de <span className="line-through">{reais(cheio)}</span> por
        </p>
        <Preco valor={preco} escuro={escuro} />
        <p className={cn("mt-2 text-[13px] font-semibold", escuro ? "text-rose-soft" : "text-rose")}>
          Você economiza {reais(cheio - preco)} ({Math.round((1 - preco / cheio) * 100)}%)
        </p>
      </div>
      <div className="mt-auto pt-6">
        <Button variant={escuro ? "pop" : "default"} className="w-full" disabled>
          Compra em breve
        </Button>
        <p className={cn("mt-2 text-center text-[12px]", fraco)}>Vale 30 dias a partir da compra</p>
      </div>
    </article>
  );
};

/** Pacote de um tipo só: mais discreto, para completar o que faltar. */
const Avulso = ({ pacote }: { pacote: Pacote }) => {
  const tipo = TIPOS.find(({ tipo }) => pacote[tipo] > 0)!;
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold leading-tight">
          <tipo.icone className="h-4 w-4 text-rose" /> {conteudo(pacote)}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{PARA_QUE[pacote.id]}</p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          {reais(PRECO_AVULSO[tipo.tipo])} por {tipo.nome[0]} · vale 30 dias
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <Preco valor={pacote.preco} pequeno />
        <Button variant="outline" size="sm" disabled>
          Compra em breve
        </Button>
      </div>
    </article>
  );
};

const BOM_SABER: { icone: LucideIcon; texto: string }[] = [
  { icone: Sparkles, texto: "Os da semana são usados primeiro. Os comprados só entram quando eles acabam." },
  { icone: Clock, texto: "Os comprados valem 30 dias a partir da compra. O que sobrar depois disso expira." },
  { icone: RotateCcw, texto: "Se a IA falhar, o crédito volta para o seu saldo." },
];

const ehCombo = (p: Pacote) => p.assistente > 0 && p.roteiro > 0;
const combos = PACOTES.filter(ehCombo);
const avulsos = PACOTES.filter((p) => !ehCombo(p));

/** Saldo da aluna e os pacotes de créditos (a compra ainda não existe: botões "Compra em breve"). */
const Creditos = () => (
  <div className="space-y-12">
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-10">
      <header>
        <p className="eyebrow">Créditos</p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-5xl">
          Acabou a semana? <span className="accent-word text-gradient pr-1">Continue criando.</span>
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Toda semana você ganha {LIMITE_SEMANAL.assistente} perguntas e {LIMITE_SEMANAL.roteiro} roteiros. Se precisar
          de mais, compre um pacote: os créditos ficam guardados por 30 dias.
        </p>
      </header>
      <Saldo />
    </div>

    <section aria-labelledby="pacotes" className="space-y-6">
      <h2 id="pacotes" className="font-display text-2xl font-semibold tracking-tight">
        Escolha seu pacote
      </h2>
      <div className="grid gap-6 pt-3 md:grid-cols-2 md:gap-5">
        {combos.map((p, i) => (
          <Combo key={p.id} pacote={p} escuro={i === 0} />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ou só o que faltar</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {avulsos.map((p) => (
            <Avulso key={p.id} pacote={p} />
          ))}
        </div>
      </div>
    </section>

    <ul className="grid gap-4 border-t border-border pt-6 text-[14px] leading-relaxed text-muted-foreground sm:grid-cols-3">
      {BOM_SABER.map(({ icone: Icone, texto }) => (
        <li key={texto} className="flex gap-3">
          <Icone className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
          {texto}
        </li>
      ))}
    </ul>
  </div>
);

export default Creditos;
