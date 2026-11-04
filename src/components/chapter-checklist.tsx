import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ChapterChecklistProps = {
  items: { key: string; label: string }[];
  interactive?: boolean;
  done?: Set<string>;
  onToggle?: (key: string, checked: boolean) => void;
  title?: string;
};

export const ChapterChecklist = ({
  items,
  interactive = false,
  done,
  onToggle,
  title = "Checklist",
}: ChapterChecklistProps) => {
  const completedCount = items.filter((item) => done?.has(item.key)).length;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </p>
        <p className="font-display text-sm text-foreground/50">
          {completedCount}/{items.length}
        </p>
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const checked = Boolean(done?.has(item.key));
          const content = (
            <>
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                  checked
                    ? "border-rose bg-rose text-primary-foreground"
                    : "border-foreground/25 bg-transparent",
                )}
              >
                {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span
                className={cn(
                  "text-[15px] leading-relaxed transition-colors",
                  checked ? "text-muted-foreground line-through" : "text-foreground/85",
                )}
              >
                {item.label}
              </span>
            </>
          );

          if (!interactive) {
            return (
              <li key={item.key} className="flex items-start gap-3 py-2">
                {content}
              </li>
            );
          }

          return (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={checked}
                onClick={() => onToggle?.(item.key, !checked)}
                className="flex w-full items-start gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-secondary/50"
              >
                {content}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
