"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/app/app-shell";
import DefinirSenha from "@/components/app/definir-senha";
import { Loader } from "@/components/app/loader";
import Unlock from "@/components/app/unlock";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";
import { destinoSemSessao } from "@/lib/navegacao";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, saiu } = useAuth();
  const { hasAccess, trocarSenha, isLoading } = useAccess();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(destinoSemSessao(pathname, saiu));
  }, [loading, user, saiu, router, pathname]);

  if (loading || !user || isLoading) return <Loader />;
  if (trocarSenha) return <DefinirSenha expirada={trocarSenha === "expirada"} />;
  if (!hasAccess) return <Unlock />;
  return <AppShell>{children}</AppShell>;
}
