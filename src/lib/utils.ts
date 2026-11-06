import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Divide o texto nos trechos entre `**`; os índices ímpares vão em negrito. */
export function partesNegrito(texto: string) {
  return texto.split(/\*\*([^*]+?)\*\*/)
}
