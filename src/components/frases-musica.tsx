"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { linhasDaPlanilha, normalizar } from "@/lib/frases-musica";

type FraseAdmin = { id: string; categoria: string; produto: string; frase: string; tipo: string; cena: string; criado_em: string };
type Importacao = { novas: number; repetidas: number; recusadas: { linha: number; motivo: string }[] };

/**
 * Banco de frases da Música viral, só admin (quem bloqueia é admin() em /api/frases-musica).
 * A especialista copia as linhas da planilha e cola aqui; o gerador usa só estas frases como
 * exemplo quando a aluna escolhe a Música viral.
 */
export const FrasesMusica = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [resultado, setResultado] = useState<Importacao | null>(null);

  const lista = useQuery({
    queryKey: ["frases-musica", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ frases: FraseAdmin[] }>("/api/frases-musica")).frases,
    retry: false,
  });

  // Prévia na hora de colar: quantas linhas a planilha tem e quantas vão ser recusadas.
  const previa = useMemo(() => {
    if (!texto.trim()) return null;
    const lidas = linhasDaPlanilha(texto);
    return { boas: lidas.filter((l) => l.ok).length, ruins: lidas.filter((l) => !l.ok).length };
  }, [texto]);

  const importar = useMutation({
    mutationFn: () => api<Importacao>("/api/frases-musica", { method: "POST", body: { texto } }),
    onSuccess: (r) => {
      setResultado(r);
      setTexto("");
      toast.success(`${r.novas} ${r.novas === 1 ? "frase entrou" : "frases entraram"} no banco.`);
      void queryClient.invalidateQueries({ queryKey: ["frases-musica"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => api(`/api/frases-musica?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["frases-musica"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const frases = useMemo(() => {
    const todas = lista.data ?? [];
    const alvo = normalizar(busca);
    if (!alvo) return todas;
    return todas.filter((f) => normalizar(`${f.categoria} ${f.produto} ${f.frase} ${f.tipo}`).includes(alvo));
  }, [lista.data, busca]);

  if (lista.error?.message === "Acesso restrito à administração.") {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        Esta página é só da administração.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div>
          <p className="font-display text-lg font-semibold">Colar da planilha</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Selecione as linhas na planilha (pode incluir o cabeçalho), copie e cole aqui. As colunas precisam estar
            nesta ordem: <strong>Categoria · Produto · Frase na tela · Tipo de frase · Cena sugerida</strong>. A
            mesma frase do mesmo produto não entra duas vezes.
          </p>
        </div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"Pijama e Camisola\tPijama americano\tpov: você é viciada em dormir cheirosa 🎀\tPOV identidade\tPijama dobrado em cima da cama"}
          rows={6}
          className="rounded-2xl bg-secondary/40 font-mono text-[12.5px]"
          aria-label="Linhas da planilha"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => importar.mutate()} disabled={!previa?.boas || importar.isPending}>
            {importar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar frases
          </Button>
          {previa ? (
            <p className="text-[13px] text-muted-foreground">
              {previa.boas} {previa.boas === 1 ? "linha pronta" : "linhas prontas"}
              {previa.ruins ? ` · ${previa.ruins} com problema (vão ficar de fora)` : ""}
            </p>
          ) : null}
        </div>
        {resultado ? (
          <div className="rounded-2xl bg-secondary/50 p-3 text-[13px] leading-relaxed">
            <p>
              <strong>{resultado.novas}</strong> novas · <strong>{resultado.repetidas}</strong> já estavam no banco
              {resultado.recusadas.length ? (
                <>
                  {" "}
                  · <strong>{resultado.recusadas.length}</strong> recusadas
                </>
              ) : null}
            </p>
            {resultado.recusadas.length ? (
              <ul className="mt-1.5 list-disc pl-5 text-muted-foreground">
                {resultado.recusadas.slice(0, 10).map((r) => (
                  <li key={r.linha}>
                    Linha {r.linha}: {r.motivo}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-semibold">
            Banco de frases{" "}
            {lista.data ? <span className="text-[14px] font-normal text-muted-foreground">· {lista.data.length}</span> : null}
          </p>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto, frase ou tipo"
              aria-label="Buscar no banco de frases"
              className="h-10 rounded-full bg-card pl-9"
            />
          </div>
        </div>

        {lista.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : lista.error ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">{lista.error.message}</p>
        ) : !frases.length ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            {lista.data?.length ? "Nenhuma frase com essa busca." : "Nenhuma frase ainda. Cole as linhas da planilha acima."}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {frases.map((f) => (
              <li key={f.id} className="group relative rounded-[22px] border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap gap-1.5 pr-7">
                  <span className="rounded-full bg-rose-soft px-2.5 py-0.5 text-[11px] font-semibold text-rose">{f.tipo}</span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-foreground/70">
                    {f.categoria} · {f.produto}
                  </span>
                </div>
                <p className="mt-2.5 text-[15px] font-medium leading-snug">“{f.frase}”</p>
                <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">🎬 {f.cena}</p>
                <button
                  type="button"
                  onClick={() => apagar.mutate(f.id)}
                  disabled={apagar.isPending}
                  className="absolute right-3 top-3 text-muted-foreground opacity-60 transition-all hover:text-destructive group-hover:opacity-100"
                  aria-label={`Apagar a frase "${f.frase}"`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
