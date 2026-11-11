"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pin, PinOff, Plus, Quote, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Confirmacao } from "@/components/confirmacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VideoEmbed } from "@/components/video-embed";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { nomeDoPerfil } from "@/lib/nome";
import { cn } from "@/lib/utils";
import { urlDoTiktok } from "@/lib/video";

type Case = {
  id: string;
  /** true se o caso é da própria aluna (o servidor não manda quem publicou). */
  minha: boolean;
  aluna: string;
  resultado: string | null;
  texto: string | null;
  midia_url: string | null;
  destaque: boolean;
  created_at: string;
};

const emptyForm = { resultado: "", texto: "", midiaUrl: "" };
const labelClass = "text-[12px] uppercase tracking-[0.14em] text-muted-foreground";
/** O mesmo tamanho do player do TikTok: todos os cartões ficam com a mesma altura. No celular, até 280 px. */
const QUADRO = "mx-auto w-full max-w-[280px] aspect-[9/16]";
// ponytail: "ler mais" por contagem de caracteres, não pela altura renderizada; medir se errar muito.
const CORTE_QUADRO = 240;
const CORTE_LEGENDA = 110;

/** Depoimento cortado, com "Ler mais" quando passa do tamanho. */
const Depoimento = ({ texto, corte, className }: { texto: string; corte: number; className: string }) => {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > corte;
  return (
    <div>
      <p className={cn("whitespace-pre-line", className)}>{longo && !aberto ? `${texto.slice(0, corte).replace(/\s+\S*$/, "")}…` : texto}</p>
      {longo ? (
        <button type="button" onClick={() => setAberto((a) => !a)} className="mt-1 text-[12px] font-semibold text-rose hover:underline">
          {aberto ? "Ler menos" : "Ler mais"}
        </button>
      ) : null}
    </div>
  );
};

const Results = () => {
  const { user } = useAuth();
  const { isAdmin } = useAccess();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [apagando, setApagando] = useState<Case | null>(null);
  const nome = nomeDoPerfil(user?.user_metadata);

  const queryKey = ["success-cases"];
  const atualizar = () => void queryClient.invalidateQueries({ queryKey });

  const casesQuery = useQuery({
    queryKey,
    queryFn: async () => (await api<{ casos: Case[] }>("/api/resultados")).casos,
  });

  const create = useMutation({
    mutationFn: async () => {
      // O servidor também recusa; aqui só antecipa o aviso.
      if (!form.texto.trim() && !form.midiaUrl.trim()) throw new Error("Escreva o depoimento ou cole o link do vídeo.");
      await api("/api/resultados", { method: "POST", body: form });
    },
    onSuccess: () => {
      toast.success("Resultado publicado.");
      setForm(emptyForm);
      setFormOpen(false);
      atualizar();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/resultados?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: atualizar,
    onError: (error: Error) => toast.error(error.message),
  });

  const fixar = useMutation({
    mutationFn: (c: Case) => api("/api/resultados", { method: "PATCH", body: { id: c.id, destaque: !c.destaque } }),
    onSuccess: atualizar,
    onError: (error: Error) => toast.error(error.message),
  });

  const cases = casesQuery.data ?? [];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Motivação</p>
          <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-5xl">
            Mural <span className="accent-word text-gradient pr-1">das alunas</span>
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            O vídeo que deu certo e o que mudou depois do guia. Se você já teve um resultado, mesmo pequeno, conte
            aqui: ver outra Shop Girl conseguindo encurta a distância.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)} variant={formOpen ? "outline" : "default"}>
          <Plus className="h-4 w-4" />
          {formOpen ? "Fechar" : "Cadastrar resultado"}
        </Button>
      </header>

      {formOpen ? (
        <section className="space-y-4 rounded-3xl border border-border bg-card/70 p-6 shadow-soft">
          <div className="space-y-2">
            <Label htmlFor="resultado" className={labelClass}>
              Resultado em uma linha
            </Label>
            <Input
              id="resultado"
              value={form.resultado}
              maxLength={80}
              onChange={(event) => setForm({ ...form, resultado: event.target.value })}
              placeholder="Ex.: primeira venda em 9 dias"
              className="h-11 rounded-xl bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="texto" className={labelClass}>
              Depoimento
            </Label>
            <Textarea
              id="texto"
              value={form.texto}
              maxLength={2000}
              onChange={(event) => setForm({ ...form, texto: event.target.value })}
              rows={3}
              placeholder="O que você fez e o que mudou, do seu jeito de falar."
              className="rounded-xl bg-background text-[14px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="midia" className={labelClass}>
              Link do vídeo no TikTok (opcional)
            </Label>
            <Input
              id="midia"
              value={form.midiaUrl}
              onChange={(event) => setForm({ ...form, midiaUrl: event.target.value })}
              placeholder="https://www.tiktok.com/@voce/video/…"
              className="h-11 rounded-xl bg-background"
            />
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              No TikTok, toque em Compartilhar → Copiar link. O vídeo toca aqui no mural.
            </p>
          </div>

          <p className="text-[12.5px] text-muted-foreground">
            Vai aparecer como <strong className="font-semibold text-foreground">{nome ?? "Aluna do Shop Studio"}</strong>.
            {" "}
            <Link href="/app/conta" className="font-semibold text-rose hover:underline">
              Mudar o nome
            </Link>
          </p>

          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar no mural
          </Button>
        </section>
      ) : null}

      {casesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className={cn(QUADRO, "animate-pulse rounded-2xl border border-border bg-secondary/40")} />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
            <Trophy className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-2xl leading-snug">O mural está vazio, por enquanto.</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
            Conte o primeiro resultado: uma primeira venda, um vídeo que passou de mil views, uma comissão. É isso
            que faz a próxima aluna começar.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cases.map((item) => {
            // Só vídeo do TikTok aparece; prints antigos ficam só com o texto.
            const video = item.midia_url ? urlDoTiktok(item.midia_url) : null;
            return (
              <li key={item.id} className="mx-auto w-full max-w-[280px] space-y-2.5">
                {video ? (
                  <VideoEmbed url={video} titulo={`Resultado de ${item.aluna}`} previa className="max-w-[280px]" />
                ) : (
                  <div className={cn(QUADRO, "hero-surface relative flex flex-col overflow-hidden rounded-2xl p-5 text-cream")}>
                    <span className="grain absolute inset-0 opacity-30" aria-hidden="true" />
                    <Quote className="relative h-5 w-5 shrink-0 text-rose" aria-hidden="true" />
                    {/* texto curto: maior e no meio do quadro, para não sobrar um vazio escuro */}
                    <div className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
                      {/* my-auto e não justify-center: aberto pelo "Ler mais", o texto não é cortado no topo */}
                      <div className="my-auto">
                      {item.texto ? (
                        <Depoimento
                          texto={item.texto}
                          corte={CORTE_QUADRO}
                          className={cn(
                            "font-display leading-snug text-cream/95",
                            item.texto.length < 90 ? "text-[21px]" : item.texto.length < 180 ? "text-[17px]" : "text-[15px]",
                          )}
                        />
                      ) : (
                        <p className="font-display text-[19px] leading-snug text-cream/95">{item.resultado}</p>
                      )}
                      </div>
                    </div>
                  </div>
                )}

                {/* o resultado é o título; embaixo, o depoimento (dos cartões com vídeo) e quem publicou */}
                <div className="space-y-1 px-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 font-display text-[15px] font-semibold leading-snug">
                      {item.resultado ?? item.aluna}
                      {item.destaque ? (
                        <span className="chip ml-1.5 px-2 py-0.5 align-middle text-[10.5px]" data-ativo="true">
                          Fixado
                        </span>
                      ) : null}
                    </p>
                    <div className="-mr-1 -mt-0.5 flex shrink-0 items-center">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => fixar.mutate(item)}
                          disabled={fixar.isPending}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          aria-label={item.destaque ? `Desafixar resultado de ${item.aluna}` : `Fixar no topo o resultado de ${item.aluna}`}
                          title={item.destaque ? "Desafixar" : "Fixar no topo"}
                        >
                          {item.destaque ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                      ) : null}
                      {item.minha ? (
                        <button
                          type="button"
                          onClick={() => setApagando(item)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                          aria-label={`Excluir resultado de ${item.aluna}`}
                          title="Apagar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {video && item.texto ? (
                    <Depoimento texto={item.texto} corte={CORTE_LEGENDA} className="text-[13px] leading-relaxed text-foreground/75" />
                  ) : null}
                  {item.resultado ? <p className="text-[12px] text-muted-foreground">{item.aluna}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Confirmacao
        aberta={apagando !== null}
        titulo="Apagar este resultado?"
        descricao="Ele sai do mural para todas as alunas, e não dá para desfazer."
        onFechar={() => setApagando(null)}
      >
        <Button
          variant="destructive"
          onClick={() => {
            if (apagando) remove.mutate(apagando.id);
            setApagando(null);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Apagar
        </Button>
        <Button variant="ghost" onClick={() => setApagando(null)}>
          Cancelar
        </Button>
      </Confirmacao>
    </div>
  );
};

export default Results;
