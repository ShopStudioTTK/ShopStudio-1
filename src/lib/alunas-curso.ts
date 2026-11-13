import { EMAIL } from "@/lib/entrada";

/** Tira os e-mails de qualquer texto colado (lista, planilha, CSV), minúsculos e sem repetir. */
export const emailsDoTexto = (texto: string) => {
  const achados = texto.toLowerCase().match(/[^\s,;<>"'()[\]]+@[^\s,;<>"'()[\]]+\.[^\s,;<>"'()[\]]+/g) ?? [];
  return [...new Set(achados.map((e) => e.replace(/[.]+$/, "")))].filter((e) => e.length <= 254 && EMAIL.test(e));
};
