"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Clapperboard,
  Coins,
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
import { ContadorDeCreditos } from "@/components/cartao-de-credito";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";
import { useChapterProgress } from "@/hooks/use-progress";
import { chapters } from "@/content/chapters";
import type { ReactNode } from "react";
import { larguraDoMenu, MENU_MAX, MENU_MIN, menuCompacto } from "@/lib/navegacao";
import { nomeDoPerfil } from "@/lib/nome";
import { sair } from "@/lib/saida";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

/** Ferramentas primeiro: é o que a aluna veio buscar. A trilha fica logo abaixo, para quem está começando. */
const criar: NavItem[] = [
  { to: "/app", label: "Studio", icon: Home, end: true },
  { to: "/app/roteiros", label: "Ganchos e roteiros", icon: Wand2 },
  { to: "/app/roteiros-expert", label: "Roteiros expert", icon: BadgeCheck },
  { to: "/app/campeoes", label: "Vídeos campeões", icon: Clapperboard },
  { to: "/app/assistente", label: "Pergunte pra IA", icon: Sparkles },
  { to: "/app/creditos", label: "Créditos", icon: Coins },
];

const aprender: NavItem[] = [
  { to: "/app/capitulos", label: "Trilha do zero", icon: BookOpen },
  { to: "/app/checklist", label: "Checklist", icon: ListChecks },
  { to: "/app/resultados", label: "Mural das alunas", icon: Trophy },
];

/** Só aparece para admin; quem bloqueia de verdade é admin() nas rotas de /api/treinamento. */
const administracao: NavItem[] = [{ to: "/app/treinamento", label: "Treinamento da IA", icon: GraduationCap }];

const ativo = (pathname: string, item: NavItem) =>
  // com a barra: /app/roteiros não pode acender em /app/roteiros-expert
  item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

const Grupo = ({
  titulo,
  itens,
  onNavigate,
  extra,
  compacto = false,
}: {
  titulo: string;
  itens: NavItem[];
  onNavigate?: () => void;
  extra?: Record<string, ReactNode>;
  /** Menu estreito: só os ícones, com o nome no title e para leitor de tela. */
  compacto?: boolean;
}) => {
  const pathname = usePathname();
  return (
    <div>
      {compacto ? (
        <div className="mx-auto h-px w-8 bg-border" aria-hidden="true" />
      ) : (
        <p className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">{titulo}</p>
      )}
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
              title={compacto ? item.label : undefined}
              className={cn(
                "group flex min-w-0 items-center gap-3 whitespace-nowrap rounded-2xl py-2.5 text-[14px] font-medium transition-all",
                compacto ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-rose-soft text-foreground"
                  : "text-foreground/60 hover:bg-secondary hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-gradient-pop text-primary-foreground shadow-glow" : "bg-secondary text-foreground/60 group-hover:text-rose",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className={compacto ? "sr-only" : "min-w-0 flex-1 truncate"}>{item.label}</span>
              {!compacto && extra?.[item.to]}
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
    { to: "/app/roteiros?aba=gerador", label: "Criar", icon: Plus, criar: true },
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

const CHAVE_LARGURA = "shopstudio:menu-largura";

const AppShell = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { completed } = useChapterProgress();
  const { isAdmin } = useAccess();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  // Largura do menu lateral: conveniência de cada aluna, guardada só no navegador dela.
  // A guarda só monta o AppShell no navegador (depois da sessão), então dá para ler o localStorage aqui.
  const [largura, setLargura] = useState(() => {
    try {
      return larguraDoMenu(localStorage.getItem(CHAVE_LARGURA));
    } catch {
      return MENU_MAX;
    }
  });
  const asideRef = useRef<HTMLElement>(null);
  const compacto = menuCompacto(largura);
  const guardarLargura = (valor: number) => {
    try {
      localStorage.setItem(CHAVE_LARGURA, String(valor));
    } catch {
      // modo privado ou armazenamento bloqueado: vale só nesta visita
    }
  };
  const mudarLargura = (valor: number) => {
    const nova = larguraDoMenu(valor);
    setLargura(nova);
    guardarLargura(nova);
  };
  const fecharMenu = () => setMenuAberto(false);
  const nome = nomeDoPerfil(user?.user_metadata);

  // Com roteiro não salvo na tela, passa pela guarda de saída (lib/saida).
  const handleSignOut = () =>
    sair(async () => {
      await signOut();
      router.replace("/");
    });

  const progressoTrilha = (
    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] font-semibold text-foreground/60">
      {completed.size}/{chapters.length}
    </span>
  );

  // `compacto` só vale no menu lateral do computador; o do celular abre sempre inteiro.
  const navegacao = (onNavigate?: () => void, compacto = false) => (
    <div className="space-y-6">
      <Button asChild variant="pop" className={compacto ? "h-10 w-full px-0" : "w-full"}>
        <Link href="/app/roteiros?aba=gerador" onClick={onNavigate} title={compacto ? "Novo roteiro" : undefined}>
          <Wand2 className="h-4 w-4" />
          <span className={compacto ? "sr-only" : "truncate"}>Novo roteiro</span>
        </Link>
      </Button>
      <Grupo titulo="Criar" itens={criar} onNavigate={onNavigate} compacto={compacto} />
      <Grupo
        titulo="Aprender"
        itens={aprender}
        onNavigate={onNavigate}
        extra={{ "/app/capitulos": progressoTrilha }}
        compacto={compacto}
      />
      {isAdmin && <Grupo titulo="Admin" itens={administracao} onNavigate={onNavigate} compacto={compacto} />}
    </div>
  );

  const account = (compacto = false) => (
    <div
      className={cn(
        "flex items-center rounded-2xl border border-border bg-card/80 p-2.5",
        compacto ? "flex-col gap-1.5 px-1" : "gap-3",
      )}
    >
      <Link href="/app/conta" onClick={fecharMenu} title="Minha conta" className="flex min-w-0 flex-1 items-center gap-3">
        <span className="bg-gradient-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-primary-foreground">
          {(nome ?? user?.email ?? "s").slice(0, 1).toUpperCase()}
        </span>
        {compacto ? (
          <span className="sr-only">Minha conta</span>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-foreground/85">{nome ?? user?.email}</p>
            <p className="truncate text-[11px] text-muted-foreground">Minha conta ✦</p>
          </div>
        )}
      </Link>
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

  // Alça na borda direita do menu: arrasta para estreitar (até só os ícones); a largura original é o máximo.
  const arrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    const esquerda = asideRef.current?.getBoundingClientRect().left ?? 0;
    const alca = e.currentTarget;
    alca.setPointerCapture(e.pointerId);
    const mover = (ev: PointerEvent) => setLargura(larguraDoMenu(ev.clientX - esquerda));
    const soltar = (ev: PointerEvent) => {
      alca.removeEventListener("pointermove", mover);
      alca.removeEventListener("pointerup", soltar);
      guardarLargura(larguraDoMenu(ev.clientX - esquerda));
    };
    alca.addEventListener("pointermove", mover);
    alca.addEventListener("pointerup", soltar);
  };

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-clip">
      <aside
        ref={asideRef}
        style={{ width: largura }}
        className={cn(
          "glass sticky top-0 hidden h-screen shrink-0 flex-col justify-between overflow-y-auto border-r border-border py-6 lg:flex",
          compacto ? "px-2" : "px-4",
        )}
      >
        <div>
          <Link href="/app" className={cn("block", compacto ? "text-center" : "px-3")} aria-label="Shop Studio, início">
            <Wordmark className={compacto ? "text-[17px]" : "text-[26px]"} stacked={compacto} />
          </Link>
          <div className={cn("mt-3", compacto ? "text-center" : "px-3")}>
            <ContadorDeCreditos empilhado={compacto} comNomes={!compacto} />
          </div>
          <div className="mt-7">{navegacao(undefined, compacto)}</div>
        </div>
        <div className="mt-6">{account(compacto)}</div>
      </aside>
      {/* Fica fora do aside (que rola): presa na borda dele, na altura da tela. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Largura do menu"
        aria-valuemin={MENU_MIN}
        aria-valuemax={MENU_MAX}
        aria-valuenow={largura}
        tabIndex={0}
        title="Arraste para ajustar o menu (duplo clique volta ao tamanho cheio)"
        onPointerDown={arrastar}
        onDoubleClick={() => mudarLargura(MENU_MAX)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") mudarLargura(largura - 16);
          else if (e.key === "ArrowRight") mudarLargura(largura + 16);
          else return;
          e.preventDefault();
        }}
        className="group sticky top-0 z-20 -mx-1.5 hidden h-screen w-3 shrink-0 cursor-col-resize touch-none lg:block"
      >
        <span className="mx-auto block h-full w-px bg-transparent transition-colors group-hover:bg-rose/50 group-focus-visible:bg-rose" />
      </div>

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-border px-5 py-3 lg:hidden">
          <Link href="/app">
            <Wordmark className="text-[22px]" />
          </Link>
          <ContadorDeCreditos className="ml-auto mr-2" />
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
              <div className="mt-6">{account()}</div>
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
