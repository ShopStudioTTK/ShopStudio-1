import type { Metadata } from "next";
import { PaginaDeVendas } from "@/components/pagina-de-vendas";

export const metadata: Metadata = {
  title: "Shop Studio — Garanta o seu acesso",
  description: "Roteiros prontos, frases de música viral e uma assistente de IA para vender no TikTok Shop.",
};

/** Página de vendas pública (shopstudio.app.br/checkout). Sem login. */
export default function Checkout() {
  return <PaginaDeVendas />;
}
