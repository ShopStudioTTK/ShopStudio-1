import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", async () => {
  const b = await import("../../apoio/db-falso");
  return { db: () => b.sqlFalso };
});
vi.mock("@/lib/supabase/admin", async () => (await import("../../apoio/db-falso")).adminFalso);
vi.mock("@/lib/access", () => ({ temAcesso: () => true }));

import { conferirSenha, createSignedUrls, getUser, naTabela, reiniciarDb, responderCom, updateUserById } from "../../apoio/db-falso";
import * as acesso from "@/app/api/acesso/route";
import * as conta from "@/app/api/conta/route";
import * as creditos from "@/app/api/creditos/route";
import * as ganchos from "@/app/api/ganchos/route";
import * as notaDoGancho from "@/app/api/ganchos/nota/route";
import * as pedidos from "@/app/api/pedidos/route";
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

  it("pedidos: retoma só pedido da aluna logada", async () => {
    await pedidos.GET(req(`/api/pedidos?id=${ID}&user_id=${OUTRA}`));
    expect(naTabela("ai_perguntas")[0].valores).toEqual(["u1", ID]);
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

  it("resultados: publica em nome de quem está logada; apaga só o próprio; só vídeo do TikTok", async () => {
    await resultados.POST(req("/api/resultados", "POST", { texto: "Vendi", user_id: OUTRA }));
    expect(naTabela("success_cases")[0].valores[0]).toBe("u1");
    expect(naTabela("success_cases")[0].valores).not.toContain(OUTRA);
    expect((await resultados.POST(req("/api/resultados", "POST", { texto: "Vendi", midiaUrl: "javascript:alert(1)" }))).status).toBe(400);
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

  it("acesso: admin só aparece para quem está em admins, olhando a conta logada", async () => {
    responderCom([["from public.admins", [{}]]]);
    expect(await (await acesso.GET(req("/api/acesso?user_id=u2"))).json()).toEqual({ acesso: true, admin: true });
    expect(naTabela("admins")[0].valores).toEqual(["u1"]);
    reiniciarDb();
    expect(await (await acesso.GET(req("/api/acesso"))).json()).not.toHaveProperty("admin");
  });

  it("conta: o TikTok lido e gravado é sempre o da conta logada", async () => {
    await conta.GET(req("/api/conta?user_id=u2"));
    expect(naTabela("profiles")[0].valores).toEqual(["u1"]);
    await conta.PATCH(req("/api/conta", "PATCH", { tiktok: "@ana", user_id: OUTRA, id: OUTRA }));
    expect(naTabela("profiles")[1].valores[0]).toBe("u1");
    expect(naTabela("profiles")[1].valores).not.toContain(OUTRA);
  });

  it("conta: muda a conta logada e confere a senha dela, nunca a do id mandado no corpo", async () => {
    conferirSenha.mockResolvedValue("ok");
    updateUserById.mockResolvedValue({ data: {}, error: null });
    await conta.PATCH(req("/api/conta", "PATCH", { nome: "Hack", senha: "nova123", senhaAtual: "x", user_id: OUTRA, id: OUTRA }));
    expect(conferirSenha).toHaveBeenCalledWith("u1@x.com", "x");
    expect(updateUserById).toHaveBeenCalledWith("u1", expect.anything());
    expect(naTabela("profiles")[0].valores[0]).toBe("u1");
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

  it("ganchos: a nota que volta é a da aluna logada; o autor nunca sai; registra e dá nota em nome dela", async () => {
    await ganchos.GET(req("/api/ganchos?user_id=u2"));
    expect(naTabela("ganchos")[0].valores).toEqual(["u1"]);
    expect(naTabela("ganchos")[0].sql).not.toMatch(/select[^]*g\.user_id[^]*from/);

    await ganchos.POST(req("/api/ganchos", "POST", { categoria: "quebra", texto: "Um gancho meu", user_id: OUTRA }));
    expect(naTabela("ganchos")[1].valores.filter((v) => v === "u1")).toHaveLength(2); // grava e conta o dia dela
    expect(naTabela("ganchos")[1].valores).not.toContain(OUTRA);

    await notaDoGancho.POST(req("/api/ganchos/nota", "POST", { id: ID, nota: 5, user_id: OUTRA }));
    expect(naTabela("gancho_notas").at(-1)?.valores).toEqual([ID, "u1", 5]);
  });

  it("créditos: lê só a semana da aluna logada", async () => {
    responderCom([["from public.entitlements", [{}]]]);
    await creditos.GET(req("/api/creditos?user_id=u2"));
    expect(naTabela("creditos_semana")[0].valores[0]).toBe("u1");
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
    // a coleção "campeao" saiu (os Campeões têm tabela própria)
    expect((await videos.GET(req("/api/videos?colecao=campeao"))).status).toBe(400);
  });
});
