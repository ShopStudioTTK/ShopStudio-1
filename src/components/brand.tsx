import { cn } from "@/lib/utils";

export const Sparkle = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={cn("h-3 w-3", className)}
  >
    <path d="M12 0c.55 5.6 6.4 11.45 12 12-5.6.55-11.45 6.4-12 12-.55-5.6-6.4-11.45-12-12C5.6 11.45 11.45 5.6 12 0Z" />
  </svg>
);

type WordmarkProps = {
  className?: string;
  tone?: "ink" | "cream";
  stacked?: boolean;
};

export const Wordmark = ({ className, tone = "ink", stacked = false }: WordmarkProps) => (
  <span
    className={cn(
      "font-display leading-[0.82] tracking-[-0.035em]",
      tone === "cream" ? "text-cream" : "text-foreground",
      className,
    )}
  >
    {stacked ? (
      <>
        shop
        <br />
        studio
      </>
    ) : (
      "shop studio"
    )}
    <span className="text-rose">.</span>
  </span>
);
