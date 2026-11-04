"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, MailQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const ResetPassword = () => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (ok) {
      const timer = setTimeout(() => router.replace("/app"), 1800);
      return () => clearTimeout(timer);
    }
  }, [ok, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (senha.length < 6) {
      setError("A senha precisa de pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setError("As duas senhas precisam ser iguais.");
      return;
    }

    setSalvando(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
      if (updateError) throw updateError;
      setOk(true);
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Não consegui salvar a nova senha.",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-editorial sm:p-9">
        <Wordmark className="text-[28px]" />

        {ok ? (
          <div className="mt-7">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h1 className="mt-4 font-display text-3xl leading-tight">Senha atualizada</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Pronto, amiga. Estamos te levando para o app.
            </p>
          </div>
        ) : !loading && user ? (
          <>
            <span className="mt-7 flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
              <MailQuestion className="h-5 w-5" />
            </span>
            <h1 className="mt-4 font-display text-3xl leading-tight">Criar uma senha nova</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Escolha a senha que você vai usar no celular e no computador.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Nova senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  autoComplete="new-password"
                  className="h-11 rounded-xl bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Repetir a senha
                </Label>
                <Input
                  id="confirmar"
                  type="password"
                  value={confirmar}
                  onChange={(event) => setConfirmar(event.target.value)}
                  placeholder="Digite de novo"
                  autoComplete="new-password"
                  className="h-11 rounded-xl bg-background"
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Salvar nova senha
                {!salvando ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            </form>
          </>
        ) : (
          <div className="mt-7">
            <h1 className="font-display text-3xl leading-tight">Abra o link do seu e-mail</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Para criar uma senha nova, clique no link que enviamos para o seu e-mail. Ele vale por
              pouco tempo — se expirar, peça outro na tela de entrada.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/entrar">Voltar para a entrada</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
