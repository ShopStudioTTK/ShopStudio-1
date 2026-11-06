"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/brand";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api-cliente";

/**
 * Primeiro acesso: a conta veio com senha temporária e o servidor só libera o app depois da troca.
 * Passadas 24 horas, a temporária expira e só o suporte gera outra (chamando o webhook de novo).
 */
const DefinirSenha = ({ expirada }: { expirada: boolean }) => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { senhaDefinida } = useAccess();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (senha !== confirmacao) {
      setError("As duas senhas não são iguais.");
      return;
    }
    setSalvando(true);
    try {
      await api("/api/senha", { method: "POST", body: { senha } });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não consegui salvar agora.");
      setSalvando(false);
      return;
    }
    // Trocar a senha derruba as sessões abertas (Supabase): entra de novo, já com a senha nova.
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: user?.email ?? "", password: senha });
    if (loginError) {
      await signOut();
      router.replace("/entrar");
      return;
    }
    await senhaDefinida();
  };

  return (
    <div className="hero-surface relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="grain absolute inset-0 opacity-30" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-[110px]"
        style={{ background: "radial-gradient(circle, hsl(var(--rose) / 0.55), transparent 70%)" }}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-cream/15 bg-cream p-7 text-foreground shadow-editorial sm:p-9">
        <Wordmark className="text-[28px]" />
        <span className="mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-3xl leading-tight">
          {expirada ? "Sua senha temporária expirou" : "Defina a sua senha"}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {expirada
            ? "Por segurança, a senha temporária vale só 24 horas. Fale com o suporte do Shop Studio para receber uma nova."
            : "Você entrou com a senha temporária. Escolha a sua senha para continuar; é com ela que você entra daqui para frente."}
        </p>

        {expirada ? null : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                Nova senha
              </Label>
              <Input
                id="senha"
                type="password"
                required
                minLength={6}
                maxLength={72}
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmacao" className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                Repita a senha
              </Label>
              <Input
                id="confirmacao"
                type="password"
                required
                minLength={6}
                maxLength={72}
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                autoComplete="new-password"
                className="h-11 rounded-xl bg-background"
              />
            </div>
            {error ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="rose" size="lg" className="w-full" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Salvar minha senha
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/entrar");
          }}
          className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair desta conta
        </button>
      </div>
    </div>
  );
};

export default DefinirSenha;
