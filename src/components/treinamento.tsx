"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, Link2, MessageCircle, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";

/** Formato que GET /api/treinamento devolve (a rota é só servidor; não importar daqui). */
export type Status = "pendente" | "respondida" | "descartada";
export type Origem = "mapeada" | "aluna" | "admin";
export type PerguntaTreino = {
  id: string;
  origem: Origem;
  status: Status;
  pergunta: string;
  contexto: string | null;
  resposta_ia: string | null;
  resposta: string | null;
  indexada: boolean;
  criado_em: string;
  respondido_em: string | null;
  parecida: { id: string; pergunta: string; resposta: string; similaridade: number } | null;
};
export type Fila = {
  conversas: { id: string; criado_em: string; perguntas: PerguntaTreino[] }[];
  soltas: PerguntaTreino[];
  contagem: Record<Status, number>;
};

export const MAX_PERGUNTA = 1000;
export const MAX_RESPOSTA = 4000;

export const ROTULO_ORIGEM: Record<Origem, string> = { mapeada: "Mapeada", aluna: "Aluna", admin: "Criada" };

/** Todas as alterações passam por aqui e recarregam a fila. */
export const useSalvarTreino = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ method, body }: { method: "POST" | "PATCH" | "DELETE"; body: Record<string, unknown> }) =>
      api<{ indexada?: boolean } | null>("/api/treinamento", { method, body }),
    onSuccess: (res) => {
      if (res && res.indexada === false) toast.warning("Salvo, mas não indexado. Salve de novo em instantes.");
      else toast.success("Salvo.");
      void queryClient.invalidateQueries({ queryKey: ["treinamento"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

const Contador = ({ valor, max }: { valor: string; max: number }) => (
  <span className={cn("text-[11px]", valor.length > max ? "text-destructive" : "text-muted-foreground")}>
    {valor.length}/{max}
  </span>
);

/** Formulário de pergunta + resposta, usado para responder, editar e criar. */
const Editor = ({
  pergunta: perguntaInicial,
  resposta: respostaInicial,
  comPergunta,
  rotulo,
  onSalvar,
  onCancelar,
  salvando,
}: {
  pergunta: string;
  resposta: string;
  comPergunta: boolean;
  rotulo: string;
  onSalvar: (v: { pergunta: string; resposta: string }) => void;
  onCancelar: () => void;
  salvando: boolean;
}) => {
  const [pergunta, setPergunta] = useState(perguntaInicial);
  const [resposta, setResposta] = useState(respostaInicial);
  const invalido =
    !resposta.trim() || resposta.length > MAX_RESPOSTA || (comPergunta && (!pergunta.trim() || pergunta.length > MAX_PERGUNTA));
  return (
    <div className="space-y-3">
      {comPergunta && (
        <label className="block space-y-1">
          <span className="flex justify-between text-[12px] font-semibold text-foreground/70">
            Pergunta <Contador valor={pergunta} max={MAX_PERGUNTA} />
          </span>
          <Textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} rows={2} className="rounded-xl" />
        </label>
      )}
      <label className="block space-y-1">
        <span className="flex justify-between text-[12px] font-semibold text-foreground/70">
          Resposta do seu jeito <Contador valor={resposta} max={MAX_RESPOSTA} />
        </span>
        <Textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={6}
          className="rounded-xl"
          placeholder="Responda como você responderia para uma aluna: com as suas palavras, gírias e o tamanho certo."
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={invalido || salvando} onClick={() => onSalvar({ pergunta: pergunta.trim(), resposta: resposta.trim() })}>
          <Check className="h-4 w-4" /> {rotulo}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

/** "Parecida com…": abre a de referência com a resposta, editável ali mesmo. */
const Parecida = ({ parecida }: { parecida: NonNullable<PerguntaTreino["parecida"]> }) => {
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState(false);
  const salvar = useSalvarTreino();
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-3">
      <button type="button" onClick={() => setAberta(!aberta)} className="flex w-full items-center gap-2 text-left text-[12.5px] text-foreground/70">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-rose" />
        <span className="flex-1">
          Parecida com: <strong className="font-semibold text-foreground">{parecida.pergunta}</strong> ({Math.round(parecida.similaridade * 100)}%)
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", aberta && "rotate-180")} />
      </button>
      {aberta && (
        <div className="mt-3 border-t border-border pt-3">
          {editando ? (
            <Editor
              pergunta={parecida.pergunta}
              resposta={parecida.resposta}
              comPergunta
              rotulo="Salvar a de referência"
              salvando={salvar.isPending}
              onCancelar={() => setEditando(false)}
              onSalvar={(v) => salvar.mutate({ method: "PATCH", body: { id: parecida.id, ...v } }, { onSuccess: () => setEditando(false) })}
            />
          ) : (
            <>
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{parecida.resposta}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditando(true)}>
                Editar a de referência
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Uma pergunta, com as ações conforme o status. Numa conversa, `numero` mostra a ordem. */
export const CartaoPergunta = ({ p, numero }: { p: PerguntaTreino; numero?: number }) => {
  const [modo, setModo] = useState<"ver" | "responder" | "apagar">("ver");
  const salvar = useSalvarTreino();
  const patch = (body: Record<string, unknown>) => salvar.mutate({ method: "PATCH", body: { id: p.id, ...body } }, { onSuccess: () => setModo("ver") });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-2">
        {numero !== undefined && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">{numero}</span>
        )}
        <p className="min-w-0 flex-1 font-display text-[16px] font-semibold leading-snug">{p.pergunta}</p>
        {numero === undefined && <span className="chip !py-0.5 !text-[11px]">{ROTULO_ORIGEM[p.origem]}</span>}
        {p.status === "respondida" && !p.indexada && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">não indexada</span>
        )}
      </div>

      {numero === undefined && p.contexto && (
        <p className="whitespace-pre-wrap text-[12px] text-muted-foreground">Antes, a aluna perguntou: {p.contexto}</p>
      )}

      {p.resposta_ia && (
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MessageCircle className="h-3 w-3" /> O que a IA respondeu
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{p.resposta_ia}</p>
        </div>
      )}

      {p.resposta && modo !== "responder" && (
        <div className="rounded-xl border border-rose/30 bg-rose-soft/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose">Resposta da expert</p>
          <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed">{p.resposta}</p>
        </div>
      )}

      {p.parecida && <Parecida parecida={p.parecida} />}

      {modo === "responder" ? (
        <Editor
          pergunta={p.pergunta}
          resposta={p.resposta ?? ""}
          comPergunta
          rotulo="Salvar resposta"
          salvando={salvar.isPending}
          onCancelar={() => setModo("ver")}
          onSalvar={(v) => patch(v.pergunta === p.pergunta ? { resposta: v.resposta } : v)}
        />
      ) : modo === "apagar" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-destructive/10 p-3 text-[13px]">
          <span className="flex-1">Apagar esta pergunta de vez?</span>
          <Button size="sm" variant="destructive" disabled={salvar.isPending} onClick={() => salvar.mutate({ method: "DELETE", body: { id: p.id } })}>
            Apagar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setModo("ver")}>
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {p.status === "pendente" && (
            <>
              <Button size="sm" onClick={() => setModo("responder")}>Responder</Button>
              {p.resposta_ia && (
                <Button size="sm" variant="outline" disabled={salvar.isPending} onClick={() => patch({ resposta: p.resposta_ia })}>
                  <Check className="h-4 w-4" /> Aprovar a da IA
                </Button>
              )}
              <Button size="sm" variant="ghost" disabled={salvar.isPending} onClick={() => patch({ status: "descartada" })}>
                <X className="h-4 w-4" /> Descartar
              </Button>
            </>
          )}
          {p.status === "respondida" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setModo("responder")}>Editar</Button>
              <Button size="sm" variant="ghost" disabled={salvar.isPending} onClick={() => patch({ status: "pendente" })}>
                <Undo2 className="h-4 w-4" /> Voltar para pendente
              </Button>
            </>
          )}
          {p.status === "descartada" && (
            <Button size="sm" variant="outline" disabled={salvar.isPending} onClick={() => patch({ status: "pendente" })}>
              <Undo2 className="h-4 w-4" /> Voltar para pendente
            </Button>
          )}
          {p.status !== "pendente" && (
            <Button size="sm" variant="ghost" onClick={() => setModo("apagar")} aria-label="Apagar">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/** "Nova pergunta": a administração escreve a pergunta e a resposta, que já entram respondidas. */
export const NovaPergunta = ({ onFechar }: { onFechar: () => void }) => {
  const salvar = useSalvarTreino();
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <p className="font-display text-lg font-semibold">Nova pergunta</p>
      <div className="mt-3">
        <Editor
          pergunta=""
          resposta=""
          comPergunta
          rotulo="Criar"
          salvando={salvar.isPending}
          onCancelar={onFechar}
          onSalvar={(v) => salvar.mutate({ method: "POST", body: v }, { onSuccess: onFechar })}
        />
      </div>
    </div>
  );
};
