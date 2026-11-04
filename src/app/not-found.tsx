import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-5 text-center">
      <Wordmark className="text-[32px]" />
      <p className="eyebrow">404</p>
      <h1 className="font-display text-4xl leading-tight">Página não encontrada</h1>
      <Link href="/" className="text-[14px] text-rose underline underline-offset-4">
        Voltar para o início
      </Link>
    </div>
  );
}
