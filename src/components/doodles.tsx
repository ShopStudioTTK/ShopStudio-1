import { cn } from "@/lib/utils";

export const Squiggle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 12" fill="none" aria-hidden="true" className={cn("h-3 w-24", className)}>
    <path
      d="M2 8c14-6 26 4 40-1s24-7 38 0 22 5 38-3"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export const ArrowCurve = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 90 60" fill="none" aria-hidden="true" className={cn("h-12 w-20", className)}>
    <path
      d="M4 6c26 2 46 14 58 34"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeDasharray="1 7"
    />
    <path
      d="M52 44l12 1-3-12"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const StarBurst = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={cn("h-6 w-6", className)}>
    <path d="M20 2v9M20 29v9M2 20h9M29 20h9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M8 8l6 6M26 26l6 6M32 8l-6 6M14 26l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const DotsStrip = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 80 8" fill="none" aria-hidden="true" className={cn("h-2 w-20", className)}>
    {[4, 18, 32, 46, 60, 74].map((x, index) => (
      <circle key={x} cx={x} cy="4" r={index === 2 ? 3 : 1.8} fill="currentColor" />
    ))}
  </svg>
);

/** Mockup de celular com o fluxo de venda desenhado em vetor */
export const PhoneMock = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 220 300" fill="none" aria-hidden="true" className={cn("h-auto w-full", className)}>
    <rect x="8" y="4" width="204" height="292" rx="30" fill="hsl(var(--foreground) / 0.06)" />
    <rect x="14" y="10" width="192" height="280" rx="26" fill="hsl(var(--card))" stroke="hsl(var(--border))" />
    <rect x="86" y="20" width="48" height="6" rx="3" fill="hsl(var(--foreground) / 0.14)" />

    <rect x="30" y="42" width="160" height="112" rx="14" fill="hsl(var(--rose-soft))" />
    <circle cx="66" cy="82" r="18" fill="hsl(var(--rose) / 0.5)" />
    <path d="M56 118c10-14 22-20 34-20s24 6 34 20" stroke="hsl(var(--rose) / 0.65)" strokeWidth="4" strokeLinecap="round" />
    <rect x="112" y="60" width="62" height="7" rx="3.5" fill="hsl(var(--rose) / 0.55)" />
    <rect x="112" y="76" width="44" height="7" rx="3.5" fill="hsl(var(--rose) / 0.35)" />

    <rect x="30" y="166" width="160" height="30" rx="10" fill="hsl(var(--secondary))" />
    <path d="M46 181h44" stroke="hsl(var(--foreground) / 0.28)" strokeWidth="3" strokeLinecap="round" />

    <rect x="30" y="208" width="160" height="34" rx="17" fill="hsl(var(--rose))" />
    <path d="M78 225h64" stroke="hsl(var(--primary))" strokeWidth="3.4" strokeLinecap="round" />

    <rect x="30" y="256" width="100" height="8" rx="4" fill="hsl(var(--foreground) / 0.12)" />
  </svg>
);
