"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, ExternalLink, Loader2 } from "lucide-react";
import { Confirmacao } from "@/components/confirmacao";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-cliente";
import type { Notificacao } from "@/lib/notificacoes";
import { cn } from "@/lib/utils";

export const NOTIFICACOES_KEY = "notificacoes";

const quando = (data: string) =>
  new Date(data).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** As notificações da aluna (o servidor só devolve as publicadas depois que a conta dela nasceu). */
export const useNotificacoes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: [NOTIFICACOES_KEY, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await api<{ notificacoes: Notificacao[] }>("/api/notificacoes")).notificacoes,
  });
};

/** O link da notificação, com o texto que a admin deu (sem texto, o endereço). Abre em outra aba. */
const LinkDaNotificacao = ({ n, className }: { n: Notificacao; className?: string }) =>
  n.link ? (
    <a href={n.link} target="_blank" rel="noopener noreferrer" className={className}>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{n.link_texto ?? n.link}</span>
    </a>
  ) : null;

/**
 * Pop-up das notificações ainda não vistas, uma de cada vez (a mais nova primeiro), na primeira
 * página do app que a aluna abrir. Fechar marca como vista no banco, então não volta em outro aparelho.
 */
export const AvisoDeNotificacao = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lista = useNotificacoes();
  const vista = useMutation({
    mutationFn: (id: string) => api("/api/notificacoes", { method: "PATCH", body: { id } }),
  });
  const atual = lista.data?.find((n) => !n.vista);
  if (!atual) return null;

  const fechar = () => {
    vista.mutate(atual.id);
    // na tela já conta como vista, mesmo se a gravação falhar: senão o pop-up voltaria na hora
    queryClient.setQueryData<Notificacao[]>([NOTIFICACOES_KEY, user?.id], (antes) =>
      antes?.map((n) => (n.id === atual.id ? { ...n, vista: true } : n)),
    );
  };

  return (
    <Confirmacao aberta titulo={atual.titulo} descricao={atual.descricao} onFechar={fechar}>
      <Button onClick={fechar}>Entendi</Button>
      {atual.link ? (
        <Button variant="outline" asChild>
          <a href={atual.link} target="_blank" rel="noopener noreferrer" className="max-w-full">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{atual.link_texto ?? atual.link}</span>
          </a>
        </Button>
      ) : null}
    </Confirmacao>
  );
};

/** Sininho ao lado do logo (no celular, no topo): abre a lista; o pontinho = alguma ainda não vista. */
export const SininhoDeNotificacoes = ({ className }: { className?: string }) => {
  const [aberta, setAberta] = useState(false);
  const lista = useNotificacoes();
  const novas = lista.data?.some((n) => !n.vista) ?? false;

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setAberta(true)}
        aria-label={novas ? "Notificações (há novas)" : "Notificações"}
        title="Notificações"
        className={cn("relative h-8 w-8 shrink-0 bg-card", className)}
      >
        <Bell className="h-4 w-4" />
        {novas ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose" aria-hidden /> : null}
      </Button>

      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader className="pr-6 text-left">
            <SheetTitle className="font-display text-xl font-semibold tracking-tight">Notificações</SheetTitle>
            <SheetDescription className="text-[13px]">Os avisos do Shop Studio, dos mais novos para os mais antigos.</SheetDescription>
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
                Nenhuma notificação por aqui.
              </p>
            ) : (
              <ul className="space-y-2 px-2">
                {lista.data.map((n) => (
                  <li key={n.id} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[14.5px] font-semibold leading-snug">{n.titulo}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{quando(n.criado_em)}</p>
                    <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground/85">{n.descricao}</p>
                    <LinkDaNotificacao
                      n={n}
                      className="mt-3 inline-flex max-w-full items-center gap-1.5 text-[13px] font-semibold text-rose hover:underline"
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
