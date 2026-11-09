import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { getUser, naTabela, reiniciarDb, responderCom } from "../apoio/db-falso";
import { admin } from "@/lib/api-auth";

const req = (auth: string | null = "Bearer tok") =>
  new Request("http://x/api/treinamento", { headers: auth ? { Authorization: auth } : {} });
const msg = async (res: Response) => (await res.json()).error.message;

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarDb();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("admin()", () => {
  it("conta em admins segue, conferida pelo id do token", async () => {
    responderCom([["from public.admins", [{}]], ["from public.entitlements", [{}]]]);
    const r = await admin(req(), "treinamento");
    expect(r).not.toBeInstanceOf(Response);
    expect((r as { userId: string }).userId).toBe("u1");
    expect(naTabela("admins")[0].valores).toEqual(["u1"]);
  });

  it("sem linha em admins → 403", async () => {
    const r = (await admin(req(), "treinamento")) as Response;
    expect(r.status).toBe(403);
    expect(await msg(r)).toBe("Acesso restrito à administração.");
  });

  it("banco falhou → 500, nunca libera", async () => {
    responderCom([["from public.admins", new Error("caiu")]]);
    expect(((await admin(req(), "treinamento")) as Response).status).toBe(500);
  });

  it("sem token → 401 sem consultar admins", async () => {
    expect(((await admin(req(null), "treinamento")) as Response).status).toBe(401);
    expect(naTabela("admins")).toHaveLength(0);
  });

  it("senha temporária pendente → 403 antes de olhar admins", async () => {
    responderCom([["from public.senhas_temporarias", [{ valida: true }]], ["from public.admins", [{}]]]);
    const r = (await admin(req(), "treinamento")) as Response;
    expect(r.status).toBe(403);
    expect(await msg(r)).toMatch(/senha/i);
    expect(naTabela("admins")).toHaveLength(0);
  });
});
