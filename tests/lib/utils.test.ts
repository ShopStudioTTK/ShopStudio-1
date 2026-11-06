import { expect, test } from "vitest";
import { cn, partesNegrito } from "@/lib/utils";

test("cn mescla classes conflitantes do Tailwind", () => {
  expect(cn("px-2", "px-4")).toBe("px-4");
});

test("partesNegrito separa o texto entre ** (índices ímpares = negrito)", () => {
  expect(partesNegrito("faça **isso** e **aquilo** já")).toEqual([
    "faça ", "isso", " e ", "aquilo", " já",
  ]);
  expect(partesNegrito("sem marca")).toEqual(["sem marca"]);
  // ** ainda aberto (resposta chegando aos poucos) fica como texto
  expect(partesNegrito("quase **lá")).toEqual(["quase **lá"]);
  expect(partesNegrito("**duas\nlinhas**")).toEqual(["", "duas\nlinhas", ""]);
});
