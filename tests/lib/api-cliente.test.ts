import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const signOut = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: () => getSession(), signOut: (o: unknown) => signOut(o) } } }));

import { api } from "@/lib/api-cliente";

const resposta = (status: number, corpo: unknown = { error: { message: "x" } }) =>
  new Response(JSON.stringify(corpo), { status });

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
  signOut.mockResolvedValue({ error: null });
});

describe("api()", () => {
  it("401 (sessão que o servidor não aceita mais) encerra a sessão local e pede para entrar de novo", async () => {
    global.fetch = vi.fn().mockResolvedValue(resposta(401, { error: { message: "Faça login." } })) as typeof fetch;
    await expect(api("/api/acesso")).rejects.toThrow("Sua sessão expirou. Entre de novo.");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("401 de um token velho, com outra sessão já aberta (entrou de novo), não derruba a sessão nova", async () => {
    getSession
      .mockResolvedValueOnce({ data: { session: { access_token: "velho" } } })
      .mockResolvedValue({ data: { session: { access_token: "novo" } } });
    global.fetch = vi.fn().mockResolvedValue(resposta(401)) as typeof fetch;
    await expect(api("/api/acesso")).rejects.toThrow();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("403 e outros erros não mexem na sessão", async () => {
    global.fetch = vi.fn().mockResolvedValue(resposta(403, { error: { message: "Sua senha atual não confere." } })) as typeof fetch;
    await expect(api("/api/conta", { method: "PATCH", body: {} })).rejects.toThrow("Sua senha atual não confere.");
    expect(signOut).not.toHaveBeenCalled();
  });
});
