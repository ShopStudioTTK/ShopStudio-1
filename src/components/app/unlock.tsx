"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/brand";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";

const Unlock = () => {
  const router = useRouter();
  const { signOut } = useAuth();
  const { redeem } = useAccess();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const liberado = await redeem.mutateAsync(code);
      if (!liberado) {
        setError("Esse código não existe ou já foi usado além do limite. Confira com o suporte.");
        return;
      }
      router.replace("/app");
    } catch (redeemError) {
      setError(redeemError instanceof Error ? redeemError.message : "Não consegui validar agora.");
    }
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
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="mt-4 font-display text-3xl leading-tight">Seu acesso ainda não foi liberado</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          O Shop Studio é exclusivo para alunas com acesso comprado. Se você já comprou, use o código
          que você recebeu por e-mail ou WhatsApp.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="SHOPSTUDIO-XXXX"
            className="h-12 rounded-xl bg-background text-center font-display text-lg tracking-[0.12em]"
            autoComplete="one-time-code"
          />
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[13px] text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="rose" size="lg" className="w-full" disabled={redeem.isPending || code.trim().length < 4}>
            {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Liberar meu acesso
          </Button>
        </form>

        <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
          Não encontrou o código? Fale com o suporte do Shop Studio que a gente resolve.
        </p>

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

export default Unlock;
