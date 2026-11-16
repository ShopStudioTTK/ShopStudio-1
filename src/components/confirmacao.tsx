"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

type Props = {
  aberta: boolean;
  titulo: string;
  descricao: string;
  /** Esc, clique fora ou o botão de cancelar. */
  onFechar: () => void;
  /** Os botões, do principal para o de cancelar. */
  children: ReactNode;
};

/** Pop-up de confirmação: prende o foco, fecha com Esc e devolve o foco ao fechar. */
export const Confirmacao = ({ aberta, titulo, descricao, onFechar, children }: Props) => (
  <Dialog.Root open={aberta} onOpenChange={(abrir) => !abrir && onFechar()}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[26px] border border-border bg-card p-6 shadow-editorial">
        <Dialog.Title className="font-display text-xl font-semibold tracking-tight">{titulo}</Dialog.Title>
        <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{descricao}</Dialog.Description>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row-reverse sm:flex-wrap">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
