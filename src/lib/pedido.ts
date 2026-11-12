// Pedido de IA (roteiro ou pergunta) que sobrevive ao F5: o id fica no sessionStorage, que some
// quando a aba fecha, e o servidor guarda a resposta (GET /api/pedidos).
import { api } from "@/lib/api-cliente";

type Tipo = "roteiro" | "assistente";
const chave = (tipo: Tipo) => `shopstudio:pedido:${tipo}`;

// sessionStorage pode faltar ou estar bloqueado: aí só não retoma.
export const lembrar = (tipo: Tipo, valor: unknown) => {
  try {
    sessionStorage.setItem(chave(tipo), JSON.stringify(valor));
  } catch {}
};

export const lembrado = <T>(tipo: Tipo): T | null => {
  try {
    return JSON.parse(sessionStorage.getItem(chave(tipo)) ?? "null") as T | null;
  } catch {
    return null;
  }
};

export const esquecer = (tipo: Tipo) => {
  try {
    sessionStorage.removeItem(chave(tipo));
  } catch {}
};

/**
 * Espera o pedido feito antes do F5 ficar pronto e devolve o que a rota de IA teria devolvido.
 * Falha (não chegou, IA falhou, passou do tempo) vira erro com a mensagem do servidor.
 * O servidor encerra a espera: depois de 90 s sem resultado, responde 504.
 */
export async function esperarPedido<T>(id: string, intervalo = 2000): Promise<T> {
  for (;;) {
    const r = await api<T | { pendente: true }>(`/api/pedidos?id=${id}`);
    if (!(r && typeof r === "object" && "pendente" in r)) return r as T;
    await new Promise((ok) => setTimeout(ok, intervalo));
  }
}
