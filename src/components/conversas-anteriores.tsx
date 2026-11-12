"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Confirmacao } from "@/components/confirmacao";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CONVERSAS_KEY, type ChatMessage } from "@/hooks/use-ai-chat";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";

type Resumo = { id: string; titulo: string; atualizado_em: string };
export type ConversaSalva = { id: string; titulo: string; mensagens: { role: ChatMessage["role"]; content: string }[] };

type Props = {
  /** A IA está escrevendo: abrir outra conversa agora perderia a resposta. */
  desabilitado: boolean;
  onAbrir: (conversa: ConversaSalva) => void;
  onApagou: (id: string) => void;
};

const quando = (data: string) =>
  new Date(data).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** "Conversas anteriores": as 30 mais recentes da aluna, para abrir, continuar ou apagar. */
export const ConversasAnteriores = ({ desabilitado, onAbrir, onApagou }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [aberta, setAberta] = useState(false);
  const [apagando, setApagando] = useState<Resumo | null>(null);

  const lista = useQuery({
    queryKey: [CONVERSAS_KEY, user?.id],
    enabled: aberta && Boolean(user?.id),
    queryFn: async () => (await api<{ conversas: Resumo[] }>("/api/conversas")).conversas,
  });
  const abrir = useMutation({
    mutationFn: async (id: string) => (await api<{ conversa: ConversaSalva }>(`/api/conversas?id=${id}`)).conversa,
    onSuccess: (conversa) => {
      onAbrir(conversa);
      setAberta(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const apagar = useMutation({
    mutationFn: (id: string) => api(`/api/conversas?id=${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      onApagou(id);
      void queryClient.invalidateQueries({ queryKey: [CONVERSAS_KEY] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setAberta(true)} disabled={desabilitado}>
        <History className="h-3.5 w-3.5" />
        {/* No celular, "Conversas anteriores" + "Nova conversa" não cabem numa linha. */}
        <span className="sm:hidden">Histórico</span>
        <span className="hidden sm:inline">Conversas anteriores</span>
      </Button>

      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="pr-6 text-left">
            <SheetTitle className="font-display text-xl font-semibold tracking-tight">Conversas anteriores</SheetTitle>
            <SheetDescription className="text-[13px]">
              Toque numa conversa para ler e continuar de onde parou. Abrir não gasta crédito.
            </SheetDescription>
          </SheetHeader>

          <div className="-mx-2 flex-1 overflow-y-auto">
            {lista.isPending ? (
              <p className="flex items-center gap-2 px-2 py-6 text-[13px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
              </p>
            ) : lista.isError ? (
              <p className="px-2 py-6 text-[13px] text-destructive">{lista.error.message}</p>
            ) : lista.data.length === 0 ? (
              <p className="mx-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
                Suas conversas aparecem aqui depois da primeira resposta.
              </p>
            ) : (
              <ul className="space-y-1">
                {lista.data.map((c) => (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => abrir.mutate(c.id)}
                      disabled={abrir.isPending}
                      className="block w-full rounded-2xl px-3 py-2.5 pr-10 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                    >
                      <span className="line-clamp-2 text-[14px] font-medium leading-snug text-foreground/90">{c.titulo}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        {abrir.isPending && abrir.variables === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        {quando(c.atualizado_em)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setApagando(c)}
                      className="absolute right-2 top-2.5 rounded-full p-1.5 text-muted-foreground opacity-60 transition-all hover:text-destructive group-hover:opacity-100"
                      aria-label={`Apagar a conversa “${c.titulo}”`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dentro do Sheet: dois pop-ups irmãos brigariam pelo foco. */}
          <Confirmacao
            aberta={apagando !== null}
            titulo="Apagar esta conversa?"
            descricao={`“${apagando?.titulo ?? ""}” sai das suas conversas anteriores, e não dá para desfazer.`}
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
        </SheetContent>
      </Sheet>
    </>
  );
};
