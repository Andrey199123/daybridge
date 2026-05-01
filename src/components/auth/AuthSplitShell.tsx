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
    <div className="relative min-h-screen overflow-hidden bg-[#06111d] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,131,255,0.18),transparent_38%),radial-gradient(circle_at_20%_80%,rgba(24,54,104,0.45),transparent_34%)]" />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(122,167,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(122,167,255,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#10284b] to-transparent opacity-60" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12 lg:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <section className="order-2 flex flex-col justify-between lg:order-1">
            <div className="max-w-2xl">
              <p className="arc-kicker text-blue-100/72">{leftEyebrow}</p>
              <h1 className="arc-display mt-6 max-w-3xl text-[clamp(2.8rem,8vw,4.8rem)] font-bold leading-[0.94] text-white">
                {leftTitle}
              </h1>
              <p className="arc-copy mt-6 max-w-xl text-[1.05rem] leading-8 text-slate-300">
                {leftDescription}
              </p>
            </div>

            <div className="mt-10 rounded-[22px] border border-[#29476f] bg-[#081423] p-6 shadow-[0_24px_80px_rgba(2,8,18,0.55)]">
              {leftPanel}
            </div>

            {leftFooter ? <div className="mt-6">{leftFooter}</div> : null}
          </section>

          <aside className="order-1 rounded-[22px] border border-[#29476f] bg-[#091626]/95 p-1 shadow-[0_24px_80px_rgba(2,8,18,0.6)] lg:order-2">
            <div className="h-full rounded-[20px] border border-white/6 bg-[#0c1a2d]">
              <div className="border-b border-[#1f3554] px-8 py-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="arc-kicker text-blue-100/70">{rightEyebrow}</p>
                    <h2 className="arc-display mt-3 text-[clamp(2.2rem,5vw,3.4rem)] font-bold text-white">
                      {rightTitle}
                    </h2>
                    <p className="arc-copy mt-4 max-w-md text-[1rem] leading-7 text-slate-300">
                      {rightDescription}
                    </p>
                  </div>

                  {rightHeaderBadge ?? (
                    <div className="relative mt-1 hidden h-20 w-20 shrink-0 items-center justify-center rounded-[20px] border border-[#35547c] bg-[#0d1c31] lg:flex">
                      <ArcMark className="h-10 w-10 text-blue-200" />
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
