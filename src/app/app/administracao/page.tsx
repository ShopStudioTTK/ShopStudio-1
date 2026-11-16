"use client";

import { useState } from "react";
import { AlunasCurso } from "@/components/alunas-curso";
import { LiberarAcesso } from "@/components/liberar-acesso";
import { NotificacoesAdmin } from "@/components/notificacoes-admin";

type Secao = "notificacoes" | "alunas" | "acesso";

const SECOES: { id: Secao; rotulo: string; texto: string }[] = [
  {
    id: "notificacoes",
    rotulo: "Notificações",
    texto: "Avisos para as alunas: aparecem uma vez num pop-up, assim que elas abrem o app, e ficam guardados no sininho.",
  },
  {
    id: "alunas",
    rotulo: "Alunas do curso",
    texto:
      "Quem já é aluna do curso. A página de checkout consulta esta lista quando alguém digita o e-mail em “já sou aluna”. Compras do curso pela Applyfy entram sozinhas.",
  },
  {
    id: "acesso",
    rotulo: "Liberar acesso",
    texto: "Para quem pagou e não recebeu o e-mail. Cole os e-mails e o app cria a conta e manda o acesso, como depois da compra.",
  },
];

/**
 * Administração das alunas (só admin): notificações, alunas do curso e liberar acesso. A tela não
 * decide nada: quem bloqueia é admin() em /api/notificacoes, /api/alunas-curso e /api/liberar-acesso.
 */
const Administracao = () => {
  // ponytail: a seção fica só no estado; recarregar volta para Notificações. URL se isso incomodar.
  const [secao, setSecao] = useState<Secao>("notificacoes");
  const atual = SECOES.find((s) => s.id === secao)!;
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Administração</p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-5xl">
          Alunas e <span className="accent-word">avisos</span>
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{atual.texto}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SECOES.map(({ id, rotulo }) => (
          <button key={id} type="button" className="chip" data-ativo={secao === id} onClick={() => setSecao(id)}>
            {rotulo}
          </button>
        ))}
      </div>

      {secao === "notificacoes" ? <NotificacoesAdmin /> : secao === "alunas" ? <AlunasCurso /> : <LiberarAcesso />}
    </div>
  );
};

export default Administracao;
