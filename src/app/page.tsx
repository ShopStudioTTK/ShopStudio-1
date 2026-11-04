"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/app/loader";
import { useAuth } from "@/hooks/use-auth";

export default function Root() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? "/app" : "/entrar");
  }, [loading, user, router]);

  return <Loader />;
}
