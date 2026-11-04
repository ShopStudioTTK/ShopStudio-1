"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, ImageIcon, Loader2, Play, Plus, Quote, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Case = {
  id: string;
  user_id: string;
  aluna: string;
  resultado: string | null;
  texto: string | null;
  midia_url: string | null;
  midia_tipo: string;
  destaque: boolean;
  created_at: string;
};

const emptyForm = {
  aluna: "",
  resultado: "",
  texto: "",
  midiaUrl: "",
  midiaTipo: "imagem",
  destaque: false,
};

const labelClass = "text-[12px] uppercase tracking-[0.14em] text-muted-foreground";

const Results = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const queryKey = ["success-cases"];

  const casesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("success_cases")
        .select("*")
        .order("destaque", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Case[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sessão expirada.");
      if (!form.aluna.trim()) throw new Error("Coloque o nome da aluna.");
      const { error } = await supabase.from("success_cases").insert({
        user_id: user.id,
        aluna: form.aluna.trim(),
        resultado: form.resultado.trim() || null,
        texto: form.texto.trim() || null,
        midia_url: form.midiaUrl.trim() || null,
        midia_tipo: form.midiaTipo,
        destaque: form.destaque,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resultado publicado.");
      setForm(emptyForm);
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("success_cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const cases = casesQuery.data ?? [];

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Motivação</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
            Resultados das alunas
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Prints, vídeos e o que mudou depois do guia. Se você já teve um resultado — mesmo
            pequeno — cadastre aqui: ver outra Shop Girl conseguindo encurta a distância.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)} variant={formOpen ? "outline" : "default"}>
          <Plus className="h-4 w-4" />
          {formOpen ? "Fechar" : "Cadastrar resultado"}
        </Button>
      </header>

      {formOpen ? (
        <section className="space-y-4 rounded-3xl border border-border bg-card/70 p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="aluna" className={labelClass}>
                Nome da aluna
              </Label>
              <Input
                id="aluna"
                value={form.aluna}
                onChange={(event) => setForm({ ...form, aluna: event.target.value })}
                placeholder="Ex.: Camila"
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultado" className={labelClass}>
                Resultado em uma linha
              </Label>
              <Input
                id="resultado"
                value={form.resultado}
                onChange={(event) => setForm({ ...form, resultado: event.target.value })}
                placeholder="Ex.: primeira venda em 9 dias"
                className="h-11 rounded-xl bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="texto" className={labelClass}>
              Depoimento
            </Label>
            <Textarea
              id="texto"
              value={form.texto}
              onChange={(event) => setForm({ ...form, texto: event.target.value })}
              rows={3}
              placeholder="O que ela fez e o que mudou, no jeito dela de falar."
              className="rounded-xl bg-background text-[14px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="midia" className={labelClass}>
                Link do print ou vídeo
              </Label>
              <Input
                id="midia"
                value={form.midiaUrl}
                onChange={(event) => setForm({ ...form, midiaUrl: event.target.value })}
                placeholder="Cole o link da imagem ou do vídeo"
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <div className="space-y-2">
              <p className={labelClass}>Tipo</p>
              <div className="flex gap-2">
                {[
                  { id: "imagem", label: "Print", icon: ImageIcon },
                  { id: "video", label: "Vídeo", icon: Film },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setForm({ ...form, midiaTipo: option.id })}
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-[12.5px] transition-colors",
                        form.midiaTipo === option.id
                          ? "border-rose bg-rose-soft text-foreground"
                          : "border-border text-foreground/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-foreground/75">
            <input
              type="checkbox"
              checked={form.destaque}
              onChange={(event) => setForm({ ...form, destaque: event.target.checked })}
              className="mt-0.5 h-4 w-4 accent-[hsl(var(--rose))]"
            />
            Fixar no topo do mural
          </label>

          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            O link precisa ser público (Drive com acesso aberto, Imgur, link de vídeo do TikTok ou
            Instagram). Se preferir mandar o arquivo, envie para a administração e cadastramos.
          </p>

          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publicar no mural
          </Button>
        </section>
      ) : null}

      {casesQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-56 animate-pulse rounded-2xl border border-border bg-secondary/40" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
            <Trophy className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-2xl leading-snug">O mural está vazio — por enquanto.</p>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
            Cadastre o primeiro resultado: uma primeira venda, um vídeo que passou de mil views, um
            print de comissão. É isso que faz a próxima aluna começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cases.map((item) => (
            <article
              key={item.id}
              className={cn(
                "overflow-hidden rounded-2xl border bg-card/70",
                item.destaque ? "border-rose/50" : "border-border",
              )}
            >
              {item.midia_url ? (
                item.midia_tipo === "imagem" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.midia_url}
                    alt={`Resultado de ${item.aluna}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <a
                    href={item.midia_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-secondary/60 text-foreground/70 transition-colors hover:text-foreground"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-card shadow-soft">
                      <Play className="h-4 w-4" />
                    </span>
                    <span className="text-[12px]">Abrir vídeo</span>
                  </a>
                )
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-secondary/40">
                  <Quote className="h-6 w-6 text-rose/60" />
                </div>
              )}

              <div className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[18px] leading-snug">{item.aluna}</p>
                    {item.resultado ? (
                      <p className="mt-0.5 text-[12px] font-medium uppercase tracking-[0.12em] text-rose">
                        {item.resultado}
                      </p>
                    ) : null}
                  </div>
                  {user?.id === item.user_id ? (
                    <button
                      type="button"
                      onClick={() => remove.mutate(item.id)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Excluir resultado de ${item.aluna}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {item.texto ? (
                  <p className="text-[13.5px] leading-relaxed text-foreground/75">{item.texto}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Results;
