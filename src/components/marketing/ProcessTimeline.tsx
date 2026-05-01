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
            index !== items.length - 1 && "border-b border-[#172b45]",
          )}
        >
          <div className="absolute left-0 top-6 flex flex-col items-center">
            <div
              className={joinClasses(
                "flex items-center justify-center rounded-full border border-[#40689c] bg-[#0d1c31] text-blue-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_28px_rgba(2,8,18,0.3)]",
                compact ? "h-10 w-10 text-xs font-semibold" : "h-12 w-12 text-sm font-semibold",
              )}
            >
              {item.index}
            </div>
            {index !== items.length - 1 ? (
              <div className="mt-3 h-[calc(100%-2.75rem)] w-px bg-gradient-to-b from-[#4f86f7]/70 via-[#29476f]/45 to-transparent" />
            ) : null}
          </div>

          <div>
            <h3
              className={joinClasses(
                "arc-display font-semibold text-white",
                compact ? "text-lg" : "text-2xl",
              )}
            >
              {item.title}
            </h3>
            <p
              className={joinClasses(
                "mt-2 text-slate-300",
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
