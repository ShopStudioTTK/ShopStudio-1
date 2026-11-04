"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Mode = "login" | "signup";

const Auth = () => {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("de");
  const aposEntrar = destino && destino.startsWith("/app") ? destino : "/app";
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"link" | "senha" | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(aposEntrar);
  }, [loading, user, router, aposEntrar]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Conta criada. Confira seu e-mail para confirmar o acesso.");
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (signInError) throw signInError;
      router.replace(aposEntrar);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível continuar.";
      setError(
        message.toLowerCase().includes("invalid login credentials")
          ? "E-mail ou senha incorretos."
          : message.toLowerCase().includes("already registered")
            ? "Esse e-mail já tem uma conta. Faça login."
            : message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const enviarLinkDeAcesso = async () => {
    if (!email.trim()) {
      setError("Escreva seu e-mail para eu te enviar o link.");
      return;
    }
    setError(null);
    setNotice(null);
    setEnviando("link");
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (otpError) throw otpError;
      setNotice("Enviei um link de acesso para o seu e-mail. Abra pelo celular para entrar direto.");
    } catch {
      setError("Não consegui enviar agora. Espere um minuto e tente de novo.");
    } finally {
      setEnviando(null);
    }
  };

  const enviarNovaSenha = async () => {
    if (!email.trim()) {
      setError("Escreva seu e-mail para eu enviar o link de nova senha.");
      return;
    }
    setError(null);
    setNotice(null);
    setEnviando("senha");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir`,
      });
      if (resetError) throw resetError;
      setNotice("Enviamos um link para você criar uma senha nova. Confira o e-mail (e o spam).");
    } catch {
      setError("Não consegui enviar agora. Espere um minuto e tente de novo.");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_1fr]">
      <aside className="hero-surface relative hidden overflow-hidden p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="grain absolute inset-0 opacity-40" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full opacity-40 blur-[110px]"
          style={{ background: "radial-gradient(circle, hsl(var(--rose) / 0.5), transparent 70%)" }}
          aria-hidden="true"
        />
        <Link href="/" className="relative">
          <Wordmark tone="cream" className="text-[30px]" />
        </Link>
        <div className="relative max-w-sm">
          <p className="font-display text-[32px] leading-[1.15]">
            Acesso exclusivo para alunas do Shop Studio.
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-cream/65">
            Entre com o e-mail da sua compra e use o código que você recebeu para liberar o guia, o
            assistente de IA e as ferramentas.
          </p>
        </div>
        <div className="relative border-t border-cream/15 pt-6 text-[12px] text-cream/55">
          Comprou e não recebeu o código? Fale com o suporte do Shop Studio.
        </div>
      </aside>

      <main className="flex flex-col bg-background px-5 py-10 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Wordmark className="text-[24px]" />
          </Link>
        </div>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-10">
            <p className="eyebrow">{mode === "login" ? "Bem-vinda de volta" : "Primeiro acesso"}</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.02em]">
              {mode === "login" ? "Entrar no app" : "Criar seu acesso"}
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              {mode === "login"
                ? "Continue de onde parou: capítulos, checklists e roteiros salvos."
                : "Crie a conta com o e-mail da sua compra. No próximo passo você digita o código de acesso que recebeu."}
            </p>

            <div className="mt-8 flex rounded-full border border-border bg-secondary/50 p-1">
              {(["login", "signup"] as Mode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setMode(option);
                    setError(null);
                    setNotice(null);
                  }}
                  className={
                    "flex-1 rounded-full px-4 py-2 text-[13px] font-medium transition-colors " +
                    (mode === option
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {option === "login" ? "Entrar" : "Primeiro acesso"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" ? (
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                    Como te chamamos
                  </Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    placeholder="Seu primeiro nome"
                    autoComplete="given-name"
                    className="h-11 rounded-xl bg-card"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@email.com"
                  autoComplete="email"
                  className="h-11 rounded-xl bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  required
                  minLength={6}
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11 rounded-xl bg-card"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="rounded-xl border border-rose/30 bg-rose-soft/40 px-3.5 py-2.5 text-[13px] text-foreground">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "login" ? "Entrar" : "Criar acesso"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>

            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={enviarLinkDeAcesso}
                disabled={enviando !== null}
              >
                {enviando === "link" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Receber link de acesso no e-mail
              </Button>
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={enviarNovaSenha}
                  disabled={enviando !== null}
                  className="w-full text-center text-[12.5px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                >
                  {enviando === "senha" ? "Enviando..." : "Esqueci minha senha"}
                </button>
              ) : null}
              <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
                O link abre a área de membros direto no celular. Sem senha, sem complicação.
              </p>
            </div>

            <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">
              Ao continuar você concorda em usar o material para o seu próprio negócio, sem
              redistribuir o conteúdo.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const AuthPage = () => (
  <Suspense fallback={null}>
    <Auth />
  </Suspense>
);

export default AuthPage;
