"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/app/app-shell";
import { Loader } from "@/components/app/loader";
import Unlock from "@/components/app/unlock";
import { useAccess } from "@/hooks/use-access";
import { useAuth } from "@/hooks/use-auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasAccess, isLoading } = useAccess();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/entrar?de=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user || isLoading) return <Loader />;
  if (!hasAccess) return <Unlock />;
  return <AppShell>{children}</AppShell>;
}
