"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BENEFICIOS, OFERTA_COMBO, OFERTA_FERRAMENTA, PERGUNTAS, type Oferta } from "@/content/ofertas";
import { cn } from "@/lib/utils";

/** sem resposta · ainda não é aluna · digitando o e-mail · conferido (aluna sim/não). */
type Etapa = { tipo: "inicio" } | { tipo: "nao-aluna" } | { tipo: "email" } | { tipo: "conferido"; aluna: boolean };

const CartaoDaOferta = ({ oferta, destaque, selo }: { oferta: Oferta; destaque: boolean; selo?: string }) => (
  <div
    className={cn(
      "relative flex flex-col rounded-[28px] border p-6 sm:p-7",
      destaque ? "border-rose bg-card shadow-editorial ring-2 ring-rose/30" : "border-border bg-card/70 shadow-soft",
    )}
  >
    {selo ? (
      <span className="absolute -top-3 left-6 rounded-full bg-gradient-pop px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cream shadow-glow">
        {selo}
      </span>
    ) : null}
    <p className="font-display text-[22px] font-semibold leading-tight">{oferta.nome}</p>
    <p className="mt-1 text-[13.5px] text-muted-foreground">{oferta.resumo}</p>
    <p className="mt-4 font-display text-[40px] font-semibold leading-none tracking-[-0.03em]">
      {oferta.preco}
      <span className="ml-1.5 text-[14px] font-normal tracking-normal text-muted-foreground">à vista ou parcelado</span>
    </p>
    <ul className="mt-5 space-y-2 text-[14px]">
      {oferta.inclui.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose" /> {item}
        </li>
      ))}
    </ul>
    <div className="mt-6 flex-1" />
    {oferta.url ? (
      <Button asChild variant={destaque ? "pop" : "outline"} size="lg" className="w-full">
        <a href={oferta.url} rel="noopener">
          Quero {oferta.id === "combo" ? "o combo" : "só a ferramenta"} <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
    ) : (
      <Button variant="outline" size="lg" className="w-full" disabled>
        Checkout em breve
      </Button>
    )}
  </div>
);

export const PaginaDeVendas = () => {
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "inicio" });
  const [email, setEmail] = useState("");
  const [conferindo, setConferindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const conferir = async (event: React.FormEvent) => {
    event.preventDefault();
    setErro(null);
    setConferindo(true);
    try {
      const res = await fetch("/api/checkout/aluna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || "Não consegui conferir agora. Tente de novo.");
      setEtapa({ tipo: "conferido", aluna: Boolean(json?.aluna) });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setConferindo(false);
    }
  };

  const aluna = etapa.tipo === "conferido" && etapa.aluna;
  const mostrarOfertas = etapa.tipo === "nao-aluna" || etapa.tipo === "conferido";

  return (
    <div className="min-h-dvh bg-background">
      <header className="hero-surface relative overflow-hidden px-5 pb-20 pt-8 text-cream sm:px-10">
        <div className="grain absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-50 blur-[110px]"
          style={{ background: "radial-gradient(circle, hsl(var(--rose) / 0.6), transparent 70%)" }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-5xl">
          <Wordmark tone="cream" className="text-[26px]" />
          <div className="mt-14 max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              <Sparkles className="h-3 w-3" /> Para vender no TikTok Shop
            </p>
            <h1 className="mt-4 font-display text-[44px] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-[60px]">
              Nunca mais trave na hora de gravar.
            </h1>
            <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-cream/75">
              Você digita o produto e recebe o roteiro pronto, com o jeito de falar de quem já vende. Ou frases de tela para
              vídeos de música viral, sem precisar falar.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-5xl space-y-16 px-5 pb-20 sm:px-10">
        <section className="relative grid gap-3 sm:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-[24px] border border-border bg-card p-5 shadow-soft">
              <span className="text-2xl" aria-hidden="true">
                {b.emoji}
              </span>
              <p className="mt-3 font-display text-[17px] font-semibold leading-snug">{b.titulo}</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{b.texto}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6" aria-live="polite">
          <div className="mx-auto max-w-xl text-center">
            <p className="eyebrow">Escolha o seu acesso</p>
            <h2 className="mt-3 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.02em]">
              Você já é aluna do <span className="accent-word">curso</span>?
            </h2>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
              Quem já é aluna pode levar só a ferramenta. Quem ainda não é, leva o curso junto por um pouco mais.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="chip px-5 py-2.5 text-[14px]"
                data-ativo={etapa.tipo === "email" || etapa.tipo === "conferido"}
                onClick={() => {
                  setErro(null);
                  setEtapa({ tipo: "email" });
                }}
              >
                Sim, já sou aluna
              </button>
              <button
                type="button"
                className="chip px-5 py-2.5 text-[14px]"
                data-ativo={etapa.tipo === "nao-aluna"}
                onClick={() => setEtapa({ tipo: "nao-aluna" })}
              >
                Ainda não
              </button>
            </div>

            {etapa.tipo === "email" || etapa.tipo === "conferido" ? (
              <form onSubmit={conferir} className="mx-auto mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="O e-mail que você usou no curso"
                  aria-label="E-mail do curso"
                  autoComplete="email"
                  className="h-12 flex-1 rounded-full bg-card px-5"
                />
                <Button type="submit" size="lg" disabled={conferindo || !email.trim()}>
                  {conferindo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Conferir
                </Button>
              </form>
            ) : null}
            {erro ? <p className="mt-3 text-[13.5px] text-destructive">{erro}</p> : null}
            {etapa.tipo === "conferido" ? (
              <p
                className={cn(
                  "mx-auto mt-4 max-w-md rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
                  aluna ? "bg-rose-soft/70 text-foreground" : "bg-secondary text-foreground/80",
                )}
              >
                {aluna
                  ? "Achamos você! 🎉 Como você já é aluna do curso, pode levar só a ferramenta por R$ 197."
                  : "Não achamos esse e-mail entre as alunas do curso. Confira se é o mesmo e-mail da compra, ou leve o combo com o curso junto."}
              </p>
            ) : null}
          </div>

          {mostrarOfertas ? (
            <div className="mx-auto grid max-w-3xl gap-5 pt-3 sm:grid-cols-2">
              {aluna ? (
                <>
                  <CartaoDaOferta oferta={OFERTA_FERRAMENTA} destaque selo="Para alunas" />
                  <CartaoDaOferta oferta={OFERTA_COMBO} destaque={false} />
                </>
              ) : (
                <>
                  <CartaoDaOferta oferta={OFERTA_COMBO} destaque selo="Mais completo" />
                  <CartaoDaOferta oferta={OFERTA_FERRAMENTA} destaque={false} />
                </>
              )}
            </div>
          ) : null}
        </section>

        <section className="mx-auto max-w-2xl space-y-3">
          <p className="eyebrow text-center">Dúvidas</p>
          {PERGUNTAS.map((q) => (
            <details key={q.p} className="group rounded-[20px] border border-border bg-card p-5 shadow-soft">
              <summary className="cursor-pointer list-none font-display text-[16px] font-semibold">{q.p}</summary>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{q.r}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-[12px] text-muted-foreground">
        Pagamento processado pela Applyfy. O acesso chega no e-mail da compra.
      </footer>
    </div>
  );
};
