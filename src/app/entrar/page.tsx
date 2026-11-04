"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
  </svg>
);

const Auth = () => {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("de");
  const aposEntrar = destino && destino.startsWith("/app") ? destino : "/app";
  const { user, loading } = useAuth();
  const [indo, setIndo] = useState(false);
  // O Supabase devolve o erro na URL quando o Google recusa ou a pessoa cancela.
  const [error, setError] = useState<string | null>(
    params.get("error_description") ? "Não consegui entrar com o Google. Tente de novo." : null,
  );

  // Quem já tem sessão (inclusive voltando do Google) segue direto para o app.
  useEffect(() => {
    if (!loading && user) router.replace(aposEntrar);
  }, [loading, user, router, aposEntrar]);

  const entrarComGoogle = async () => {
    setError(null);
    setIndo(true);
    const volta = `${window.location.origin}/entrar${destino ? `?de=${encodeURIComponent(destino)}` : ""}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: volta },
    });
    if (oauthError) {
      setError("Não consegui abrir o login do Google. Tente de novo.");
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
            Entre com a sua conta Google e use o código que você recebeu para liberar o guia, o
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
            <p className="eyebrow">Bem-vinda</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.02em]">
              Entrar no app
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              Use a sua conta Google. Na primeira vez a gente cria o seu acesso na hora; depois é só
              continuar de onde parou: capítulos, checklists e roteiros salvos.
            </p>

            <Button
              type="button"
              size="lg"
              variant="outline"
              className="mt-8 w-full bg-card"
              onClick={entrarComGoogle}
              disabled={indo}
            >
              {indo ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              Entrar com Google
            </Button>

            {error ? (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
                {error}
              </p>
            ) : null}

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
