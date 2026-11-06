import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/contas", () => ({ VALIDADE_SENHA_TEMPORARIA_MIN: 24 * 60 }));

import { enviarEmailDeAcesso } from "@/lib/email";

const fetchFalso = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("RESEND_API_KEY", "re_chave");
  vi.stubEnv("EMAIL_REMETENTE", "Shop Studio <acesso@shopstudio.com>");
  vi.stubEnv("SITE_URL", "https://app.shopstudio.com/");
  vi.stubGlobal("fetch", fetchFalso);
  fetchFalso.mockResolvedValue(new Response(JSON.stringify({ id: "e1" }), { status: 200 }));
});

const corpoEnviado = () => JSON.parse(fetchFalso.mock.calls[0][1].body as string);

describe("enviarEmailDeAcesso", () => {
  it("manda pela Resend o link, o e-mail e a senha temporária", async () => {
    await enviarEmailDeAcesso({ email: "aluna@x.com", nome: "Ana", senhaTemporaria: "Temp-123_abc" });
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_chave");
    const corpo = corpoEnviado();
    expect(corpo.from).toBe("Shop Studio <acesso@shopstudio.com>");
    expect(corpo.to).toEqual(["aluna@x.com"]);
    for (const campo of [corpo.html, corpo.text]) {
      expect(campo).toContain("https://app.shopstudio.com/entrar");
      expect(campo).toContain("aluna@x.com");
      expect(campo).toContain("Temp-123_abc");
      expect(campo).toContain("24 horas");
      expect(campo).toMatch(/Atenção/);
    }
  });

  it("conta que já existia: e-mail sem senha, pedindo para entrar com a senha dela", async () => {
    await enviarEmailDeAcesso({ email: "aluna@x.com", nome: null, senhaTemporaria: null });
    const corpo = corpoEnviado();
    expect(corpo.html).toContain("https://app.shopstudio.com/entrar");
    expect(corpo.text).toMatch(/senha que você criou/);
    expect(corpo.text).not.toMatch(/temporária|Atenção/);
  });

  it("escapa o nome no HTML", async () => {
    await enviarEmailDeAcesso({ email: "a@x.com", nome: "<script>x</script>", senhaTemporaria: "s" });
    expect(corpoEnviado().html).not.toContain("<script>");
  });

  it.each(["RESEND_API_KEY", "EMAIL_REMETENTE", "SITE_URL"])("sem %s → erro, nada enviado", async (nome) => {
    vi.stubEnv(nome, "");
    await expect(enviarEmailDeAcesso({ email: "a@x.com", nome: null, senhaTemporaria: "s" })).rejects.toThrow(nome);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("Resend recusa → erro sem a senha na mensagem", async () => {
    fetchFalso.mockResolvedValue(new Response("domínio não verificado", { status: 403 }));
    const p = enviarEmailDeAcesso({ email: "a@x.com", nome: null, senhaTemporaria: "SenhaSecreta1" });
    await expect(p).rejects.toThrow(/403/);
    await expect(p).rejects.not.toThrow(/SenhaSecreta1/);
  });
});
