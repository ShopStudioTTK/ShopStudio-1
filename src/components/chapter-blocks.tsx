import { AlertTriangle, Bookmark, Check, Lightbulb, Sparkles } from "lucide-react";
import type { Block, CalloutVariant } from "@/content/types";
import { ChapterChecklist } from "@/components/chapter-checklist";
import { cn } from "@/lib/utils";

const calloutStyles: Record<
  CalloutVariant,
  { label: string; icon: typeof Lightbulb; className: string; labelClassName: string }
> = {
  pratica: {
    label: "Na prática",
    icon: Lightbulb,
    className: "border-border bg-secondary/60",
    labelClassName: "text-foreground/70",
  },
  lembre: {
    label: "Lembre-se",
    icon: Bookmark,
    className: "border-dashed border-foreground/20 bg-transparent",
    labelClassName: "text-foreground/60",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    className: "border-rose/35 bg-rose-soft/50",
    labelClassName: "text-rose",
  },
  ouro: {
    label: "Regra de ouro",
    icon: Sparkles,
    className: "hero-surface border-transparent text-cream",
    labelClassName: "text-rose-soft",
  },
};

type ChapterBlocksProps = {
  blocks: Block[];
  scope: string;
  interactive?: boolean;
  done?: Set<string>;
  onToggle?: (key: string, checked: boolean) => void;
};

export const ChapterBlocks = ({
  blocks,
  scope,
  interactive = false,
  done,
  onToggle,
}: ChapterBlocksProps) => (
  <div className="space-y-7">
    {blocks.map((block, index) => {
      const key = `${scope}-${index}`;

      switch (block.type) {
        case "p":
          return (
            <p key={key} className="max-w-[70ch] text-[17px] leading-[1.75] text-foreground/85">
              {block.text}
            </p>
          );

        case "h3":
          return (
            <h3 key={key} className="font-display text-2xl leading-tight tracking-[-0.01em] text-foreground">
              {block.text}
            </h3>
          );

        case "callout": {
          const style = calloutStyles[block.variant];
          const Icon = style.icon;
          return (
            <aside
              key={key}
              className={cn("rounded-2xl border px-5 py-5 sm:px-6", style.className)}
            >
              <div className={cn("mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]", style.labelClassName)}>
                <Icon className="h-3.5 w-3.5" />
                {block.title ?? style.label}
              </div>
              <p className="text-[15px] leading-relaxed opacity-90">{block.text}</p>
            </aside>
          );
        }

        case "steps":
          return (
            <ol key={key} className="space-y-4">
              {block.items.map((item, stepIndex) => (
                <li key={`${key}-${stepIndex}`} className="flex gap-4">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foreground/15 font-display text-sm text-foreground/70">
                    {stepIndex + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="text-[15px] font-medium leading-relaxed text-foreground">
                      {item.title}
                    </p>
                    {item.text ? (
                      <p className="text-[15px] leading-relaxed text-muted-foreground">{item.text}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          );

        case "cards":
          return (
            <div key={key} className="grid gap-3 sm:grid-cols-2">
              {block.items.map((item, cardIndex) => (
                <div
                  key={`${key}-${cardIndex}`}
                  className="rounded-2xl border border-border bg-card/70 p-5 shadow-soft"
                >
                  <p className="mb-1.5 font-display text-lg leading-snug text-foreground">
                    {item.title}
                  </p>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>
          );

        case "list":
          return (
            <ul key={key} className="space-y-2.5">
              {block.items.map((item, listIndex) => (
                <li key={`${key}-${listIndex}`} className="flex max-w-[72ch] gap-3 text-[16px] leading-relaxed text-foreground/85">
                  <Check className="mt-1.5 h-4 w-4 shrink-0 text-rose" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );

        case "table":
          return (
            <div key={key} className="overflow-x-auto rounded-2xl border border-border">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-secondary/70">
                    {block.columns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/60"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`${key}-${rowIndex}`} className="border-t border-border/70">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${key}-${rowIndex}-${cellIndex}`}
                          className={cn(
                            "px-4 py-3 text-[14px] leading-relaxed",
                            cellIndex === 0 ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );

        case "checklist":
          return (
            <ChapterChecklist
              key={key}
              items={block.items.map((item, itemIndex) => ({
                key: `${scope}-check-${itemIndex}`,
                label: item,
              }))}
              interactive={interactive}
              done={done}
              onToggle={onToggle}
            />
          );

        default:
          return null;
      }
    })}
  </div>
);
