"use client";

import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AtSign, KeyRound, Loader2, Mail, UserRound, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api-cliente";
import { nomeDoPerfil } from "@/lib/nome";

const Campo = ({ id, rotulo, ...props }: { id: string; rotulo: string } & React.ComponentProps<typeof Input>) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
      {rotulo}
    </Label>
    <Input id={id} className="h-11 rounded-xl bg-background" {...props} />
  </div>
);

const Cartao = ({
  icone: Icone,
  titulo,
  texto,
  onSubmit,
  salvando,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  texto: string;
  onSubmit: () => Promise<void>;
  salvando: boolean;
  children: ReactNode;
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      void onSubmit();
    }}
    className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-7"
  >
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-soft text-rose">
        <Icone className="h-[18px] w-[18px]" />
      </span>
      <div>
        <h2 className="font-display text-xl font-semibold">{titulo}</h2>
        <p className="text-[13px] text-muted-foreground">{texto}</p>
      </div>
    </div>
    <div className="mt-5 space-y-4">{children}</div>
    <Button type="submit" variant="rose" className="mt-5" disabled={salvando}>
      {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
      Salvar
    </Button>
  </form>
);

/** Nome, TikTok, e-mail e senha da aluna. E-mail e senha pedem a senha atual (o servidor confere). */
const Conta = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [nome, setNome] = useState(() => nomeDoPerfil(user?.user_metadata) ?? "");
  const [email, setEmail] = useState("");
  const [senhaDoEmail, setSenhaDoEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState<"nome" | "tiktok" | "email" | "senha" | null>(null);
  // O TikTok não está no token: vem do servidor. Enquanto ela não digita, o campo mostra o salvo.
  const perfil = useQuery({
    queryKey: ["conta", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => api<{ tiktok: string | null }>("/api/conta"),
  });
  const [tiktok, setTiktok] = useState<string | null>(null);

  const salvar = async (qual: "nome" | "tiktok" | "email" | "senha", body: Record<string, string>, ok: string) => {
    setSalvando(qual);
    try {
      await api("/api/conta", { method: "PATCH", body });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não consegui salvar agora.");
      setSalvando(null);
      return false;
    }
    // Nome: renova o token para os metadados novos. E-mail/senha: entra de novo (a troca da senha
    // derruba as sessões e o token antigo ainda leva o e-mail velho).
    if (qual === "nome") await supabase.auth.refreshSession();
    else if (qual === "tiktok") void perfil.refetch();
    else {
      const { error } = await supabase.auth.signInWithPassword({
        email: body.email ?? user?.email ?? "",
        password: body.senha ?? body.senhaAtual,
      });
      if (error) {
        toast.success(`${ok} Entre de novo com os dados novos.`);
        await signOut();
        router.replace("/entrar");
        return true;
      }
    }
    toast.success(ok);
    setSalvando(null);
    return true;
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Configurações</p>
        <h1 className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.035em] sm:text-5xl">
          Minha conta
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Seu nome, o seu TikTok, o e-mail com que você entra e a sua senha.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <Cartao
          icone={UserRound}
          titulo="Nome"
          texto="É como o Studio te chama."
          salvando={salvando === "nome"}
          onSubmit={async () => {
            await salvar("nome", { nome }, "Nome salvo.");
          }}
        >
          <Campo id="nome" rotulo="Seu nome" required maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        </Cartao>

        <Cartao
          icone={AtSign}
          titulo="TikTok"
          texto="No mural, quem tocar no seu nome vai para o seu perfil."
          salvando={salvando === "tiktok"}
          onSubmit={async () => {
            if (await salvar("tiktok", { tiktok: tiktok ?? perfil.data?.tiktok ?? "" }, "TikTok salvo.")) setTiktok(null);
          }}
        >
          <Campo
            id="tiktok"
            rotulo="Seu perfil no TikTok"
            maxLength={200}
            placeholder="@seuusuario ou o link do perfil"
            value={tiktok ?? perfil.data?.tiktok ?? ""}
            onChange={(e) => setTiktok(e.target.value)}
            autoComplete="off"
          />
          <p className="text-[12.5px] text-muted-foreground">Deixe vazio e salve para tirar o link.</p>
        </Cartao>

        <Cartao
          icone={Mail}
          titulo="E-mail"
          texto={`Hoje: ${user?.email ?? ""}`}
          salvando={salvando === "email"}
          onSubmit={async () => {
            if (await salvar("email", { email, senhaAtual: senhaDoEmail }, "E-mail trocado.")) {
              setEmail("");
              setSenhaDoEmail("");
            }
          }}
        >
          <Campo id="email" rotulo="E-mail novo" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Campo id="senha-do-email" rotulo="Sua senha atual" type="password" required value={senhaDoEmail} onChange={(e) => setSenhaDoEmail(e.target.value)} autoComplete="current-password" />
          <p className="text-[12.5px] text-muted-foreground">Confira bem: é com esse e-mail que você vai entrar.</p>
        </Cartao>

        <Cartao
          icone={KeyRound}
          titulo="Senha"
          texto="Mínimo de 6 caracteres."
          salvando={salvando === "senha"}
          onSubmit={async () => {
            if (senha !== confirmacao) {
              toast.error("As duas senhas novas não são iguais.");
              return;
            }
            if (await salvar("senha", { senha, senhaAtual }, "Senha trocada.")) {
              setSenhaAtual("");
              setSenha("");
              setConfirmacao("");
            }
          }}
        >
          <Campo id="senha-atual" rotulo="Senha atual" type="password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" />
          <Campo id="senha-nova" rotulo="Senha nova" type="password" required minLength={6} maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
          <Campo id="senha-confirmacao" rotulo="Repita a senha nova" type="password" required minLength={6} maxLength={72} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" />
        </Cartao>
      </div>
    </div>
  );
};

export default Conta;
