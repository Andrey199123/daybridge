type ProcessTimelineItem = {
  index: string;
  title: string;
  description: string;
};

type ProcessTimelineProps = {
  items: ProcessTimelineItem[];
  compact?: boolean;
  className?: string;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ProcessTimeline({
  items,
  compact = false,
  className,
}: ProcessTimelineProps) {
  return (
    <div className={joinClasses("relative", className)}>
      {items.map((item, index) => (
        <div
          key={item.index}
          className={joinClasses(
            "relative pl-16",
            compact ? "py-5" : "py-6",
            index !== items.length - 1 && "border-b border-[oklch(85%_0.032_116)]",
          )}
        >
          <div className="absolute left-0 top-6 flex flex-col items-center">
            <div
              className={joinClasses(
                "flex items-center justify-center rounded-full border border-[oklch(72%_0.03_116)] bg-white text-[oklch(25%_0.045_145)] shadow-[0_12px_28px_rgba(29,44,35,0.10)]",
                compact ? "h-10 w-10 text-xs font-black" : "h-12 w-12 text-sm font-black",
              )}
            >
              {item.index}
            </div>
            {index !== items.length - 1 ? (
              <div className="mt-3 h-[calc(100%-2.75rem)] w-px bg-gradient-to-b from-[oklch(40%_0.1_153)]/65 via-[oklch(57%_0.08_153)]/35 to-transparent" />
            ) : null}
          </div>

          <div>
            <h3
              className={joinClasses(
                "arc-display font-black text-[oklch(21%_0.035_145)]",
                compact ? "text-lg" : "text-2xl",
              )}
            >
              {item.title}
            </h3>
            <p
              className={joinClasses(
                "mt-2 text-[oklch(40%_0.04_145)]",
                compact ? "text-sm leading-7" : "text-base leading-7",
              )}
            >
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
