"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, Eye, ExternalLink, Loader2, Send, Trash2 } from "lucide-react";
import { Confirmacao } from "@/components/confirmacao";
import { ModalDaNotificacao, NOTIFICACOES_KEY, useNotificacoes } from "@/components/notificacoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-cliente";
import { jaApareceu, MAX_NOTIFICACAO, type Notificacao } from "@/lib/notificacoes";

const VAZIO = { titulo: "", descricao: "", link: "", linkTexto: "", apareceEm: "" };

/** O `datetime-local` vem no fuso do navegador da admin; o servidor recebe em ISO. Vazio = na hora. */
const isoDe = (local: string) => (local ? new Date(local).toISOString() : "");
const quando = (data: string) => new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/**
 * Publicar e apagar notificações (só admin; quem bloqueia é admin() em /api/notificacoes). A lista
 * aqui é a mesma do sininho: para admin, o servidor devolve todas.
 */
export const NotificacoesAdmin = () => {
  const queryClient = useQueryClient();
  const lista = useNotificacoes();
  const [form, setForm] = useState(VAZIO);
  const [apagando, setApagando] = useState<Notificacao | null>(null);
  const [vendoPrevia, setVendoPrevia] = useState(false);
  const preenchida = Boolean(form.titulo.trim() && form.descricao.trim());
  const campo = (k: keyof typeof VAZIO) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  });
  const atualizar = () => queryClient.invalidateQueries({ queryKey: [NOTIFICACOES_KEY] });

  const publicar = useMutation({
    mutationFn: () => api("/api/notificacoes", { method: "POST", body: { ...form, apareceEm: isoDe(form.apareceEm) } }),
    onSuccess: () => {
      setForm(VAZIO);
      toast.success("Notificação publicada.");
      void atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const apagar = useMutation({
    mutationFn: (id: string) => api(`/api/notificacoes?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Notificação apagada.");
      void atualizar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft"
        onSubmit={(e) => {
          e.preventDefault();
          publicar.mutate();
        }}
      >
        <p className="font-display text-lg font-semibold">Nova notificação</p>
        <div className="space-y-1.5">
          <Label htmlFor="n-titulo">Título</Label>
          <Input id="n-titulo" maxLength={MAX_NOTIFICACAO.titulo} required {...campo("titulo")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-descricao">Descrição</Label>
          <Textarea id="n-descricao" rows={4} maxLength={MAX_NOTIFICACAO.descricao} required {...campo("descricao")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="n-link">Link (opcional)</Label>
            <Input id="n-link" type="url" placeholder="https://…" {...campo("link")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n-link-texto">Texto do link (opcional)</Label>
            <Input
              id="n-link-texto"
              placeholder="Ver a aula nova"
              maxLength={MAX_NOTIFICACAO.linkTexto}
              disabled={!form.link.trim()}
              {...campo("linkTexto")}
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="n-aparece">Aparecer em (opcional)</Label>
          <Input id="n-aparece" type="datetime-local" {...campo("apareceEm")} />
          <p className="text-[12px] text-muted-foreground">Vazio = aparece assim que publicar.</p>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Aparece uma vez, num pop-up, para quem já tem conta na data em que ela aparece. Depois fica no sininho, ao
          lado do logo. Quem ganhar conta depois não vê.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="pop" disabled={publicar.isPending || !preenchida}>
            {publicar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {form.apareceEm ? "Agendar" : "Publicar"}
          </Button>
          <Button type="button" variant="outline" disabled={!preenchida} onClick={() => setVendoPrevia(true)}>
            <Eye className="h-4 w-4" />
            Ver como fica
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <p className="font-display text-lg font-semibold">Publicadas</p>
        {lista.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : lista.isError ? (
          <p className="text-[13px] text-destructive">{lista.error.message}</p>
        ) : lista.data.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
            Nenhuma notificação publicada.
          </p>
        ) : (
          <ul className="space-y-2">
            {lista.data.map((n) => (
              <li key={n.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold leading-snug">{n.titulo}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    {jaApareceu(n) ? (
                      `Apareceu em ${quando(n.aparece_em)}`
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-soft px-2 py-0.5 font-semibold text-rose">
                        <CalendarClock className="h-3 w-3" /> Agendada para {quando(n.aparece_em)}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground/85">{n.descricao}</p>
                  {n.link ? (
                    <a
                      href={n.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[13px] font-semibold text-rose hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{n.link_texto ?? n.link}</span>
                    </a>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setApagando(n)}
                  className="h-fit rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Apagar a notificação “${n.titulo}”`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ModalDaNotificacao
        previa
        aberta={vendoPrevia}
        onFechar={() => setVendoPrevia(false)}
        n={{
          titulo: form.titulo.trim(),
          descricao: form.descricao.trim(),
          link: form.link.trim() || null,
          link_texto: (form.link.trim() && form.linkTexto.trim()) || null,
          aparece_em: isoDe(form.apareceEm) || new Date().toISOString(),
        }}
      />

      <Confirmacao
        aberta={apagando !== null}
        titulo="Apagar esta notificação?"
        descricao={`“${apagando?.titulo ?? ""}” some do sininho de todas as alunas (ou não aparece, se estava agendada), e não dá para desfazer.`}
        onFechar={() => setApagando(null)}
      >
        <Button
          variant="destructive"
          onClick={() => {
            if (apagando) apagar.mutate(apagando.id);
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
