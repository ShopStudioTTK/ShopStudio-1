"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Clapperboard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";
import { useChapterProgress } from "@/hooks/use-progress";
import { chapters } from "@/content/chapters";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { to: "/app", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/app/roteiros", label: "Roteiros", icon: Wand2, end: false },
  { to: "/app/campeoes", label: "Campeões", icon: Clapperboard, end: false },
  { to: "/app/assistente", label: "Assistente", icon: Sparkles, end: false },
  { to: "/app/capitulos", label: "Capítulos", icon: BookOpen, end: false },
  { to: "/app/checklist", label: "Checklist", icon: ListChecks, end: false },
];

const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {baseNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
              isActive
                ? "bg-card text-foreground shadow-soft"
                : "text-foreground/60 hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
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
  const router = useRouter();
  const percent = Math.round((completed.size / chapters.length) * 100);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const account = (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-soft font-display text-sm text-rose">
          {(user?.email ?? "s").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-foreground/80">{user?.email}</p>
          <p className="text-[11px] text-muted-foreground">Shop Girl</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sair da conta
      </button>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full max-w-full overflow-x-clip bg-background">
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col justify-between border-r border-border bg-secondary/25 px-4 py-6 lg:flex">
        <div>
          <Link href="/app" className="px-2">
            <Wordmark className="text-[27px]" />
          </Link>

          <div className="mt-8">
            <NavItems />
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Seu progresso
            </p>
            <p className="mt-2 font-display text-3xl leading-none text-foreground">
              {percent}
              <span className="ml-0.5 text-base text-muted-foreground">%</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-rose transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-muted-foreground">
              {completed.size} de {chapters.length} capítulos
            </p>
          </div>
        </div>
        {account}
      </aside>

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-5 py-3 backdrop-blur lg:hidden">
          <Link href="/app">
            <Wordmark className="text-[23px]" />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Abrir menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[280px] flex-col justify-between bg-background px-4 py-6">
              <div>
                <Wordmark className="text-[24px]" />
                <div className="mt-7">
                  <NavItems />
                </div>
              </div>
              {account}
            </SheetContent>
          </Sheet>
        </header>

        <main className="w-full min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full min-w-0 max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
