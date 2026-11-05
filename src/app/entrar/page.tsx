"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const Auth = () => {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("de");
  const aposEntrar = destino && destino.startsWith("/app") ? destino : "/app";
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [indo, setIndo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quem já tem sessão segue direto para o app (a guarda decide se falta trocar a senha).
  useEffect(() => {
    if (!loading && user) router.replace(aposEntrar);
  }, [loading, user, router, aposEntrar]);

  const entrar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIndo(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (loginError) {
      setError(
        loginError.code === "invalid_credentials"
          ? "E-mail ou senha incorretos."
          : "Não consegui entrar agora. Tente de novo.",
      );
      setIndo(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
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
            Entre com o e-mail da compra e a senha que você recebeu. No primeiro acesso, você
            escolhe a sua senha.
          </p>
        </div>
        <div className="relative border-t border-cream/15 pt-6 text-[12px] text-cream/55">
          Comprou e não recebeu a senha? Fale com o suporte do Shop Studio.
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
            <p className="eyebrow">Bem-vinda</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.02em]">
              Entrar no app
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Use o e-mail da compra e a sua senha para continuar de onde parou: capítulos,
              checklists e roteiros salvos.
            </p>

            <form onSubmit={entrar} className="mt-6 space-y-4">
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
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                  className="h-11 rounded-xl bg-card"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={indo}>
                {indo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Entrar
                {!indo ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>

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
