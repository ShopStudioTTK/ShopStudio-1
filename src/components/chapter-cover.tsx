import {
  CalendarCheck,
  Camera,
  Clapperboard,
  Compass,
  IdCard,
  LayoutDashboard,
  Link2,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const paletas = [
  {
    bg: "linear-gradient(152deg, hsl(16 42% 15%) 0%, hsl(10 38% 10%) 100%)",
    ink: "hsl(354 45% 96%)",
    accent: "hsl(352 62% 80%)",
  },
  {
    bg: "linear-gradient(152deg, hsl(354 72% 92%) 0%, hsl(352 55% 82%) 100%)",
    ink: "hsl(16 40% 15%)",
    accent: "hsl(352 45% 42%)",
  },
  {
    bg: "linear-gradient(152deg, hsl(30 52% 90%) 0%, hsl(354 52% 88%) 100%)",
    ink: "hsl(16 40% 15%)",
    accent: "hsl(352 45% 42%)",
  },
  {
    bg: "linear-gradient(152deg, hsl(14 36% 17%) 0%, hsl(352 26% 12%) 100%)",
    ink: "hsl(354 45% 96%)",
    accent: "hsl(352 58% 82%)",
  },
];

const icones = [
  Sparkles,
  ShoppingBag,
  IdCard,
  Users,
  LayoutDashboard,
  Link2,
  Compass,
  Search,
  Package,
  Clapperboard,
  Camera,
  CalendarCheck,
];

type ChapterCoverProps = {
  numero: number;
  rotulo?: string;
  className?: string;
  variante?: "tile" | "banner";
};

export const ChapterCover = ({
  numero,
  rotulo,
  className,
  variante = "tile",
}: ChapterCoverProps) => {
  const paleta = paletas[(numero - 1) % paletas.length];
  const Icone = icones[(numero - 1) % icones.length];
  const etiqueta = rotulo ?? `Capítulo ${String(numero).padStart(2, "0")}`;

  if (variante === "banner") {
    return (
      <div
        className={cn("relative overflow-hidden rounded-3xl", className)}
        style={{ background: paleta.bg }}
      >
        <div className="grain absolute inset-0 opacity-25" aria-hidden="true" />
        <Star
          className="absolute -right-4 -top-6 h-28 w-28 opacity-20"
          style={{ color: paleta.accent }}
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: paleta.accent }}
            >
              {etiqueta}
            </span>
            <Icone className="h-5 w-5" style={{ color: paleta.accent }} />
          </div>
          <p
            className="font-display text-[64px] leading-none tracking-[-0.04em] sm:text-[84px]"
            style={{ color: paleta.ink }}
          >
            {String(numero).padStart(2, "0")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl", className)}
      style={{ background: paleta.bg }}
    >
      <div className="grain absolute inset-0 opacity-25" aria-hidden="true" />
      <Star
        className="absolute -right-3 -top-4 h-20 w-20 opacity-20"
        style={{ color: paleta.accent }}
        aria-hidden="true"
      />
      <Icone
        className="absolute right-4 top-4 h-5 w-5 opacity-80"
        style={{ color: paleta.accent }}
        aria-hidden="true"
      />
      <div className="relative p-4">
        <p
          className="font-display text-[34px] leading-none tracking-[-0.03em]"
          style={{ color: paleta.ink }}
        >
          {String(numero).padStart(2, "0")}
        </p>
        <span
          className="mt-2 block h-[3px] w-8 rounded-full"
          style={{ background: paleta.accent }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
