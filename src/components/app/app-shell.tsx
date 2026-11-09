"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Clapperboard,
  GraduationCap,
  Home,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  Sparkles,
  Trophy,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";
import { useChapterProgress } from "@/hooks/use-progress";
import { chapters } from "@/content/chapters";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

/** Ferramentas primeiro: é o que a aluna veio buscar. A trilha fica logo abaixo, para quem está começando. */
const criar: NavItem[] = [
  { to: "/app", label: "Studio", icon: Home, end: true },
  { to: "/app/roteiros", label: "Roteiros e ganchos", icon: Wand2 },
  { to: "/app/campeoes", label: "Vídeos campeões", icon: Clapperboard },
  { to: "/app/assistente", label: "Pergunte pra IA", icon: Sparkles },
];

const aprender: NavItem[] = [
  { to: "/app/capitulos", label: "Trilha do zero", icon: BookOpen },
  { to: "/app/checklist", label: "Checklist", icon: ListChecks },
  { to: "/app/resultados", label: "Mural das alunas", icon: Trophy },
];

/** Só aparece para admin; quem bloqueia de verdade é admin() nas rotas de /api/treinamento. */
const administracao: NavItem[] = [{ to: "/app/treinamento", label: "Treinamento da IA", icon: GraduationCap }];

const ativo = (pathname: string, item: NavItem) =>
  item.end ? pathname === item.to : pathname.startsWith(item.to);

const Grupo = ({
  titulo,
  itens,
  onNavigate,
  extra,
}: {
  titulo: string;
  itens: NavItem[];
  onNavigate?: () => void;
  extra?: Record<string, ReactNode>;
}) => {
  const pathname = usePathname();
  return (
    <div>
      <p className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">{titulo}</p>
      <nav className="mt-2 space-y-0.5">
        {itens.map((item) => {
          const Icon = item.icon;
          const isActive = ativo(pathname, item);
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-medium transition-all",
                isActive
                  ? "bg-rose-soft text-foreground"
                  : "text-foreground/60 hover:bg-secondary hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-gradient-pop text-primary-foreground shadow-glow" : "bg-secondary text-foreground/60 group-hover:text-rose",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1">{item.label}</span>
              {extra?.[item.to]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

/** Barra inferior do celular, com o "criar" no meio, como nos apps que elas já usam. */
const BarraInferior = () => {
  const pathname = usePathname();
  const itens: (NavItem & { criar?: boolean })[] = [
    { to: "/app", label: "Studio", icon: Home, end: true },
    { to: "/app/campeoes", label: "Campeões", icon: Clapperboard },
    { to: "/app/roteiros", label: "Criar", icon: Plus, criar: true },
    { to: "/app/assistente", label: "IA", icon: Sparkles },
    { to: "/app/capitulos", label: "Trilha", icon: BookOpen },
  ];
  // o assistente tem a caixa de mensagem presa no rodapé
  if (pathname.startsWith("/app/assistente")) return null;
  return (
    <nav
      aria-label="Navegação principal"
      className="glass fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-[26px] border border-border px-2 py-1.5 shadow-editorial lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {itens.map((item) => {
        const Icon = item.icon;
        const isActive = ativo(pathname, item);
        if (item.criar) {
          return (
            <Link
              key={item.to}
              href={item.to}
              aria-label="Criar roteiro"
              className="bg-gradient-pop -mt-6 flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground shadow-glow ring-4 ring-background transition-transform active:scale-95"
            >
              <Icon className="h-6 w-6" strokeWidth={2.5} />
            </Link>
          );
        }
        return (
          <Link
            key={item.to}
            href={item.to}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex w-14 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-semibold transition-colors",
              isActive ? "text-rose" : "text-foreground/50",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { completed } = useChapterProgress();
  const { isAdmin } = useAccess();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const fecharMenu = () => setMenuAberto(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const progressoTrilha = (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-foreground/60">
      {completed.size}/{chapters.length}
    </span>
  );

  const navegacao = (onNavigate?: () => void) => (
    <div className="space-y-6">
      <Button asChild variant="pop" className="w-full">
        <Link href="/app/roteiros" onClick={onNavigate}>
          <Wand2 className="h-4 w-4" />
          Novo roteiro
        </Link>
      </Button>
      <Grupo titulo="Criar" itens={criar} onNavigate={onNavigate} />
      <Grupo
        titulo="Aprender"
        itens={aprender}
        onNavigate={onNavigate}
        extra={{ "/app/capitulos": progressoTrilha }}
      />
      {isAdmin && <Grupo titulo="Admin" itens={administracao} onNavigate={onNavigate} />}
    </div>
  );

  const account = (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-2.5">
      <span className="bg-gradient-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-primary-foreground">
        {(user?.email ?? "s").slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-foreground/85">{user?.email}</p>
        <p className="text-[11px] text-muted-foreground">Shop Girl ✦</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Sair da conta"
        title="Sair da conta"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-clip">
      <aside className="glass sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col justify-between overflow-y-auto border-r border-border px-4 py-6 lg:flex">
        <div>
          <Link href="/app" className="block px-3">
            <Wordmark className="text-[26px]" />
          </Link>
          <div className="mt-7">{navegacao()}</div>
        </div>
        <div className="mt-6">{account}</div>
      </aside>

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-border px-5 py-3 lg:hidden">
          <Link href="/app">
            <Wordmark className="text-[22px]" />
          </Link>
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Abrir menu" className="bg-card">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[290px] flex-col justify-between overflow-y-auto bg-background px-4 py-6">
              <div>
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Wordmark className="px-3 text-[24px]" />
                <div className="mt-7">{navegacao(fecharMenu)}</div>
              </div>
              <div className="mt-6">{account}</div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="w-full min-w-0 flex-1 px-5 pb-32 pt-7 sm:px-8 lg:px-12 lg:pb-14 lg:pt-10">
          <div className="mx-auto w-full min-w-0 max-w-5xl">{children}</div>
        </main>
      </div>

      <BarraInferior />
    </div>
  );
};

export default AppShell;
