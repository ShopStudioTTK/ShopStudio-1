import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { createSignedUrls, getUser, naTabela, reiniciarDb, responderCom, updateUserById } from "../../apoio/db-falso";
import * as acesso from "@/app/api/acesso/route";
import * as perfil from "@/app/api/perfil/route";
import * as progresso from "@/app/api/progresso/route";
import * as resultados from "@/app/api/resultados/route";
import * as roteiros from "@/app/api/roteiros-salvos/route";
import * as senha from "@/app/api/senha/route";
import * as videos from "@/app/api/videos/route";

/** A conta logada é sempre "u1". O navegador tenta se passar por "u2" mandando o id no corpo. */
const OUTRA = "u2";
const ID = "11111111-2222-3333-4444-555555555555";
const req = (url: string, method = "GET", body?: unknown) =>
  new Request(`http://x${url}`, {
    method,
    headers: { Authorization: "Bearer tok", "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  reiniciarDb();
  getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "u1@x.com", user_metadata: { full_name: "Ana Souza" } } },
    error: null,
  });
});

describe("cada conta só vê e mexe no que é dela", () => {
  it("progresso: lê só o da aluna", async () => {
    responderCom([
      ["from public.chapter_progress", [{ chapter_slug: "a" }]],
      ["from public.checklist_progress", [{ item_key: "k" }]],
    ]);
    const res = await progresso.GET(req("/api/progresso"));
    expect(await res.json()).toEqual({ capitulos: ["a"], checklist: ["k"] });
    for (const t of ["chapter_progress", "checklist_progress"]) expect(naTabela(t)[0].valores).toEqual(["u1"]);
  });

  it("progresso: marca e desmarca em nome de quem está logada, nunca de outra", async () => {
    await progresso.POST(req("/api/progresso", "POST", { tipo: "capitulo", chave: "a", feito: true, user_id: OUTRA }));
    await progresso.POST(req("/api/progresso", "POST", { tipo: "checklist", chave: "k", feito: false, user_id: OUTRA }));
    expect(naTabela("chapter_progress")[0].valores).toEqual(["u1", "a"]);
    expect(naTabela("checklist_progress")[0].valores).toEqual(["u1", "k"]);
  });

  it("progresso: pedido malformado não chega no banco", async () => {
    for (const body of [{ tipo: "x", chave: "a", feito: true }, { tipo: "capitulo", chave: "", feito: true }, { tipo: "capitulo", chave: "a" }])
      expect((await progresso.POST(req("/api/progresso", "POST", body))).status).toBe(400);
    expect(naTabela("chapter_progress")).toHaveLength(0);
  });

  it("roteiros salvos: lista, salva e apaga só os da aluna", async () => {
    await roteiros.GET(req("/api/roteiros-salvos"));
    expect(naTabela("saved_scripts")[0].valores).toEqual(["u1"]);

    await roteiros.POST(req("/api/roteiros-salvos", "POST", { produto: "Sérum", conteudo: { ganchos: [] }, user_id: OUTRA }));
    expect(naTabela("saved_scripts")[1].valores[0]).toBe("u1");
    // o conteúdo vai como texto e o banco converte; senão o driver grava o JSON como string
    expect(naTabela("saved_scripts")[1].sql).toContain("?::text::jsonb");
    expect(naTabela("saved_scripts")[1].valores[3]).toBe('{"ganchos":[]}');

    responderCom([["delete from public.saved_scripts", [{}]]]);
    expect((await roteiros.DELETE(req(`/api/roteiros-salvos?id=${ID}`, "DELETE"))).status).toBe(204);
    expect(naTabela("saved_scripts")[2].valores).toEqual([ID, "u1"]);
  });

  it("roteiros salvos: apagar o de outra conta dá 404 (o filtro por user_id não acha)", async () => {
    expect((await roteiros.DELETE(req(`/api/roteiros-salvos?id=${ID}`, "DELETE"))).status).toBe(404);
    expect((await roteiros.DELETE(req("/api/roteiros-salvos?id=1 or 1=1", "DELETE"))).status).toBe(400);
  });

  it("resultados: o mural não revela quem publicou, só se é meu", async () => {
    responderCom([
      ["from public.success_cases", [
        { id: "a", user_id: "u1", aluna: "Eu" },
        { id: "b", user_id: OUTRA, aluna: "Outra" },
      ]],
    ]);
    const { casos } = await (await resultados.GET(req("/api/resultados"))).json();
    expect(casos).toEqual([
      { id: "a", aluna: "Eu", minha: true },
      { id: "b", aluna: "Outra", minha: false },
    ]);
  });

  it("resultados: publica em nome de quem está logada; apaga só o próprio; só https", async () => {
    await resultados.POST(req("/api/resultados", "POST", { aluna: "Ana", user_id: OUTRA }));
    expect(naTabela("success_cases")[0].valores[0]).toBe("u1");
    expect((await resultados.POST(req("/api/resultados", "POST", { aluna: "Ana", midiaUrl: "javascript:alert(1)" }))).status).toBe(400);
    await resultados.DELETE(req(`/api/resultados?id=${ID}`, "DELETE"));
    expect(naTabela("success_cases")[1].valores).toEqual([ID, "u1"]);
  });

  it("perfil: nome e e-mail vêm do token, não do corpo", async () => {
    await perfil.POST(req("/api/perfil", "POST", { id: OUTRA, nome: "Hack" }));
    expect(naTabela("profiles")[0].valores).toEqual(["u1", "u1@x.com", "Ana Souza"]);
  });

  it("acesso: diz se liberou e se falta trocar a senha, olhando só a conta logada", async () => {
    responderCom([["from public.senhas_temporarias", [{ valida: true }]]]);
    expect(await (await acesso.GET(req("/api/acesso?user_id=u2"))).json()).toEqual({ acesso: true, trocarSenha: "pendente" });
    expect(naTabela("entitlements")[0].valores).toEqual(["u1"]);
    expect(naTabela("senhas_temporarias")[0].valores.at(-1)).toBe("u1");

    responderCom([["from public.senhas_temporarias", [{ valida: false }]]]);
    expect(await (await acesso.GET(req("/api/acesso"))).json()).toEqual({ acesso: true, trocarSenha: "expirada" });
  });

  it("acesso: depois da troca, a resposta nem menciona senha", async () => {
    expect(await (await acesso.GET(req("/api/acesso"))).json()).toEqual({ acesso: true });
  });

  it("senha: troca a da conta logada, nunca a do id mandado no corpo", async () => {
    responderCom([["from public.senhas_temporarias", [{ valida: true }]]]);
    updateUserById.mockResolvedValue({ data: {}, error: null });
    await senha.POST(req("/api/senha", "POST", { senha: "nova123", user_id: OUTRA }));
    expect(updateUserById).toHaveBeenCalledWith("u1", { password: "nova123" });
    expect(naTabela("senhas_temporarias").every((c) => c.valores.at(-1) === "u1")).toBe(true);
  });

  it("acesso: o código é resgatado para quem está logada; muitas tentativas → 429", async () => {
    responderCom([["resgatar_codigo", [{ liberado: true }]]]);
    expect(await (await acesso.POST(req("/api/acesso", "POST", { codigo: "ABC", user_id: OUTRA }))).json()).toEqual({ liberado: true });
    expect(naTabela("resgatar_codigo")[0].valores).toEqual(["u1", "ABC"]);

    responderCom([["resgatar_codigo", Object.assign(new Error("Muitas tentativas erradas."), { code: "P0001" })]]);
    const res = await acesso.POST(req("/api/acesso", "POST", { codigo: "ABC" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error.message).toBe("Muitas tentativas erradas.");
  });

  it("vídeos: arquivo do bucket sai assinado com a validade do .env; link externo passa direto", async () => {
    vi.stubEnv("VIDEO_URL_VALIDADE_SEGUNDOS", "600");
    responderCom([
      ["from public.chapter_videos", [
        { id: "1", url: "https://p.supabase.co/storage/v1/object/public/studio-videos/a.mp4" },
        { id: "2", url: "https://www.youtube.com/watch?v=x" },
      ]],
    ]);
    createSignedUrls.mockResolvedValue({ data: [{ path: "a.mp4", signedUrl: "https://assinada" }], error: null });
    const { videos: lista } = await (await videos.GET(req("/api/videos?capitulo=c1"))).json();
    expect(createSignedUrls).toHaveBeenCalledWith(["a.mp4"], 600);
    expect(lista.map((v: { url: string }) => v.url)).toEqual(["https://assinada", "https://www.youtube.com/watch?v=x"]);
    expect((await videos.GET(req("/api/videos"))).status).toBe(400);
  });
});
