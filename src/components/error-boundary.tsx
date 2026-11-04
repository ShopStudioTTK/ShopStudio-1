"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";

type Props = { children: ReactNode };
type State = { erro: boolean };

/**
 * Evita tela branca: se uma parte do app falhar (por exemplo, um pedaço de código
 * que não carregou por causa da internet), mostramos um aviso com botão de recarregar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: false };

  static getDerivedStateFromError(): State {
    return { erro: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro no app:", error, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <Wordmark className="text-[32px]" />
        <p className="max-w-sm font-display text-2xl leading-snug">
          Algo não carregou direito por aqui.
        </p>
        <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
          Costuma ser internet instável. Toque no botão abaixo para tentar de novo — seu progresso
          está salvo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Recarregar o app
        </button>
      </div>
    );
  }
}
