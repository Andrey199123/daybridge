import type { ReactNode } from "react";
import { ArcMark } from "../ArcMark";
import { cn } from "../../lib/utils";

type AuthSplitShellProps = {
  leftEyebrow: string;
  leftTitle: string;
  leftDescription: string;
  leftPanel: ReactNode;
  leftFooter?: ReactNode;
  rightEyebrow: string;
  rightTitle: string;
  rightDescription: string;
  children: ReactNode;
  rightBodyClassName?: string;
  rightHeaderBadge?: ReactNode;
};

export function AuthSplitShell({
  leftEyebrow,
  leftTitle,
  leftDescription,
  leftPanel,
  leftFooter,
  rightEyebrow,
  rightTitle,
  rightDescription,
  children,
  rightBodyClassName,
  rightHeaderBadge,
}: AuthSplitShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(97%_0.018_116)] text-[oklch(22%_0.035_145)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(92%_0.05_116),transparent_44%),radial-gradient(circle_at_25%_80%,oklch(93%_0.06_116),transparent_40%)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(29,44,35,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(29,44,35,0.06) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <section className="order-2 flex flex-col justify-between lg:order-1">
            <div className="max-w-2xl">
              <p className="arc-kicker text-[oklch(35%_0.085_153)]">{leftEyebrow}</p>
              <h1 className="arc-display mt-6 max-w-3xl text-[clamp(2.6rem,7vw,4.4rem)] font-black leading-[0.94] text-[oklch(21%_0.035_145)]">
                {leftTitle}
              </h1>
              <p className="arc-copy mt-6 max-w-xl text-[1.1rem] leading-8 text-[oklch(36%_0.035_145)]">
                {leftDescription}
              </p>
            </div>

            <div className="mt-10 rounded-[18px] border border-[oklch(85%_0.032_116)] bg-white/80 p-6 shadow-[0_28px_70px_rgba(24,42,31,0.14)] backdrop-blur">
              {leftPanel}
            </div>

            {leftFooter ? <div className="mt-6">{leftFooter}</div> : null}
          </section>

          <aside className="order-1 rounded-[18px] border border-[oklch(85%_0.032_116)] bg-white/90 p-1 shadow-[0_32px_80px_rgba(24,42,31,0.16)] backdrop-blur lg:order-2">
            <div className="h-full rounded-[16px] border border-white/60 bg-white">
              <div className="border-b border-[oklch(85%_0.032_116)] px-8 py-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="arc-kicker text-[oklch(35%_0.085_153)]">{rightEyebrow}</p>
                    <h2 className="arc-display mt-3 text-[clamp(2.1rem,4.6vw,3.2rem)] font-black text-[oklch(21%_0.035_145)]">
                      {rightTitle}
                    </h2>
                    <p className="arc-copy mt-4 max-w-md text-[1.05rem] leading-7 text-[oklch(40%_0.04_145)]">
                      {rightDescription}
                    </p>
                  </div>

                  {rightHeaderBadge ?? (
                    <div className="relative mt-1 hidden h-20 w-20 shrink-0 items-center justify-center rounded-[20px] bg-[oklch(36%_0.1_153)] text-white shadow-[0_20px_44px_rgba(28,92,61,0.22)] lg:flex">
                      <ArcMark className="h-10 w-10" />
                    </div>
                  )}
                </div>
              </div>

              <div className={cn("px-8 py-8", rightBodyClassName)}>{children}</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
