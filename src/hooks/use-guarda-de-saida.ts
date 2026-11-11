"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { definirGuarda, destinoDoClique } from "@/lib/saida";

const ENTRADA = { guardaDeSaida: true };
// O StrictMode do dev monta, desmonta e monta de novo: a entrada extra do voltar não pode sumir nisso.
let ativas = 0;

/**
 * Enquanto `ativa`, sair da tela pergunta antes: links do app, botão voltar, `sair()` de lib/saida
 * (aba "Ganchos", "Sair da conta") e recarregar ou fechar a aba (este, com o aviso do próprio navegador).
 */
export function useGuardaDeSaida(ativa: boolean) {
  const router = useRouter();
  const [pendente, setPendente] = useState<(() => void) | null>(null);
  const liberada = useRef(false);

  useEffect(() => {
    if (!ativa) return;
    ativas++;
    liberada.current = false;
    const pedir = (acao: () => void) => setPendente(() => acao);
    const soltar = definirGuarda(pedir);

    const aoFechar = (e: BeforeUnloadEvent) => e.preventDefault();
    const aoClicar = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement)) return;
      const destino = destinoDoClique(e, { href: a.href, target: a.target, download: a.hasAttribute("download") }, location.href);
      if (!destino) return;
      // Só cancela: o onClick do Link ainda roda (fecha o menu do celular) e ele não navega por ver o defaultPrevented.
      e.preventDefault();
      // replace: o destino toma o lugar da entrada extra do voltar.
      pedir(() => router.replace(destino));
    };
    // Voltar: uma entrada extra com a mesma URL. O voltar cai nela, a tela continua e pergunta.
    // O pushState passa pelo do Next, que copia o estado interno dele para a entrada.
    if (!history.state?.guardaDeSaida) history.pushState(ENTRADA, "", location.href);
    const aoVoltar = () => {
      if (liberada.current) return;
      history.pushState(ENTRADA, "", location.href);
      pedir(() => history.go(-2));
    };

    addEventListener("beforeunload", aoFechar);
    addEventListener("popstate", aoVoltar);
    document.addEventListener("click", aoClicar, true);
    return () => {
      ativas--;
      soltar();
      removeEventListener("beforeunload", aoFechar);
      removeEventListener("popstate", aoVoltar);
      document.removeEventListener("click", aoClicar, true);
      // Não há mais o que perder (salvou) e ela ficou: tira a entrada extra, senão o voltar "não faz nada" uma vez.
      setTimeout(() => {
        if (!ativas && !liberada.current && history.state?.guardaDeSaida) history.back();
      }, 0);
    };
  }, [ativa, router]);

  return {
    aberta: pendente !== null,
    /** Segue a saída pendente. `antes` (ex.: salvar) falhando = ela fica, com o pop-up aberto. */
    sair: async (antes?: () => Promise<unknown>) => {
      const acao = pendente;
      liberada.current = true;
      try {
        await antes?.();
      } catch {
        liberada.current = false;
        return;
      }
      setPendente(null);
      acao?.();
    },
    ficar: () => setPendente(null),
  };
}
