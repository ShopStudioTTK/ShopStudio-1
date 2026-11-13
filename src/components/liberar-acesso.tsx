"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-cliente";
import { emailsDoTexto } from "@/lib/alunas-curso";
import { cn } from "@/lib/utils";

type Resultado = { email: string; status: "conta_criada" | "ja_tinha_conta" | "erro"; erro?: string };

const LOTE = 25;
const ROTULO: Record<Resultado["status"], string> = {
  conta_criada: "Acesso enviado (com senha)",
  ja_tinha_conta: "Já tinha senha própria: e-mail enviado sem senha",
  erro: "Erro: tente de novo",
};

/**
 * Liberação manual do acesso (só admin; quem bloqueia é admin() em /api/liberar-acesso).
 * Cola os e-mails de quem pagou, escolhe o produto e o app cria as contas e manda os e-mails,
 * em lotes de 25.
 */
export const LiberarAcesso = () => {
  const [texto, setTexto] = useState("");
  const [combo, setCombo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const emails = useMemo(() => (texto.trim() ? emailsDoTexto(texto) : []), [texto]);

  const liberar = async () => {
    setEnviando(true);
    setResultados([]);
    setFeitos(0);
    const todos: Resultado[] = [];
    try {
      for (let i = 0; i < emails.length; i += LOTE) {
        const lote = emails.slice(i, i + LOTE);
        const r = await api<{ resultados: Resultado[] }>("/api/liberar-acesso", {
          method: "POST",
          body: { texto: lote.join("\n"), combo },
        });
        todos.push(...r.resultados);
        setResultados([...todos]);
        setFeitos(Math.min(i + LOTE, emails.length));
      }
      const erros = todos.filter((r) => r.status === "erro").length;
      if (erros) toast.error(`${erros} não foram. Elas ficaram na caixa para tentar de novo.`);
      else toast.success(`${todos.length} acessos enviados.`);
      // Só os que deram erro ficam na caixa, para tentar de novo.
      setTexto(todos.filter((r) => r.status === "erro").map((r) => r.email).join("\n"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div>
          <p className="font-display text-lg font-semibold">Liberar acesso na mão</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            Para quem pagou e não recebeu. Cole os e-mails (lista, planilha ou CSV). Para cada um, o app cria a conta e
            manda o e-mail de acesso com uma senha temporária nova, igual ao que acontece depois da compra. Se a aluna
            já criou a senha dela, ela recebe o e-mail sem senha.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              [true, "Comprou o combo (curso + Shop Studio)"],
              [false, "Comprou só o Shop Studio"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button key={rotulo} type="button" className="chip" data-ativo={combo === valor} onClick={() => setCombo(valor)}>
              {rotulo}
            </button>
          ))}
        </div>

        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"maria@email.com\njoana@email.com"}
          rows={7}
          className="rounded-2xl bg-secondary/40 font-mono text-[12.5px]"
          aria-label="E-mails de quem pagou"
          disabled={enviando}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="pop" onClick={liberar} disabled={!emails.length || enviando}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {enviando ? `Enviando… ${feitos} de ${emails.length}` : `Liberar ${emails.length || ""} acesso${emails.length === 1 ? "" : "s"}`}
          </Button>
          <p className="text-[12.5px] text-muted-foreground">
            Use só para quem pagou. Cada envio gera uma senha nova e invalida a anterior.
          </p>
        </div>
      </section>

      {resultados.length ? (
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card shadow-soft">
          {resultados.map((r) => (
            <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[13.5px]">
              <span className="font-mono">{r.email}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                  r.status === "erro" ? "bg-destructive/10 text-destructive" : "bg-rose-soft text-rose",
                )}
              >
                {ROTULO[r.status]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
