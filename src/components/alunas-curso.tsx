"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import { emailsDoTexto } from "@/lib/alunas-curso";

type Contagem = { total: number; compras: number };
type Importacao = { lidos: number; novas: number; repetidas: number };

/**
 * Lista de alunas do curso que a página /checkout consulta (só admin; quem bloqueia é admin()
 * em /api/alunas-curso). Cole os e-mails de qualquer jeito: lista, planilha ou CSV exportado.
 */
export const AlunasCurso = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const contagem = useQuery({
    queryKey: ["alunas-curso", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<Contagem>("/api/alunas-curso"),
    retry: false,
  });
  const achados = useMemo(() => (texto.trim() ? emailsDoTexto(texto).length : 0), [texto]);

  const importar = useMutation({
    mutationFn: () => api<Importacao>("/api/alunas-curso", { method: "POST", body: { texto } }),
    onSuccess: (r) => {
      setTexto("");
      toast.success(`${r.novas} novas · ${r.repetidas} já estavam na lista.`);
      void queryClient.invalidateQueries({ queryKey: ["alunas-curso"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (contagem.error?.message === "Acesso restrito à administração.") {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        Esta página é só da administração.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-border bg-card p-5 shadow-soft">
          <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Alunas na lista</p>
          <p className="mt-1 font-display text-[34px] font-semibold leading-none">
            {contagem.isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (contagem.data?.total ?? "—")}
          </p>
        </div>
        <div className="rounded-[22px] border border-border bg-card p-5 shadow-soft">
          <p className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Vieram de compra na Applyfy</p>
          <p className="mt-1 font-display text-[34px] font-semibold leading-none">{contagem.data?.compras ?? "—"}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div>
          <p className="font-display text-lg font-semibold">Importar e-mails</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Cole os e-mails das alunas que já compraram o curso (pode ser a coluna da planilha ou o CSV exportado da
            Applyfy). Os e-mails são achados no texto; os que já estão na lista ficam como estão.
          </p>
        </div>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"maria@email.com\njoana@email.com"}
          rows={6}
          className="rounded-2xl bg-secondary/40 font-mono text-[12.5px]"
          aria-label="E-mails das alunas do curso"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => importar.mutate()} disabled={!achados || importar.isPending}>
            {importar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar
          </Button>
          {texto.trim() ? (
            <p className="text-[13px] text-muted-foreground">
              {achados} {achados === 1 ? "e-mail encontrado" : "e-mails encontrados"}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
};
