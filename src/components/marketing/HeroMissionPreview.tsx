import { ArrowRight } from "lucide-react";
import { ArcMark } from "../ArcMark";

type HeroMissionPreviewProps = {
  onClick: () => void;
};

export function HeroMissionPreview({ onClick }: HeroMissionPreviewProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Arc sign up from the Personal Galaxy product preview"
      className="group relative block w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6ea8ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111d]"
    >
      <div className="absolute inset-x-8 bottom-6 top-10 rounded-[30px] bg-[radial-gradient(circle_at_center,rgba(79,134,247,0.22),transparent_62%)] blur-3xl" />

      <div className="relative overflow-hidden rounded-[30px] border border-[#32557e] bg-[#081423] p-3 shadow-[0_30px_110px_rgba(2,8,18,0.58)] transition-transform duration-300 ease-out group-hover:-translate-y-1">
        <div className="pointer-events-none absolute inset-0 opacity-90 bg-[radial-gradient(circle_at_50%_40%,rgba(110,168,255,0.26),rgba(79,134,247,0.08)_24%,transparent_60%)]" />
        <div className="pointer-events-none absolute inset-[13%] rounded-full border border-white/7" />
        <div className="pointer-events-none absolute inset-[20%] rounded-full border border-[#6ea8ff]/18" />

        <div className="pointer-events-none absolute right-[18%] top-[16%] hidden items-center gap-2 rounded-full border border-white/10 bg-[#07111f]/84 px-4 py-2 text-sm font-medium text-slate-100 backdrop-blur-md md:flex">
          <span className="h-2 w-2 rounded-full bg-[#6ea8ff] shadow-[0_0_12px_rgba(110,168,255,0.9)]" />
          3 missions in orbit
        </div>

        <div className="pointer-events-none absolute bottom-[23%] left-[8%] hidden items-center gap-2 rounded-full border border-white/10 bg-[#07111f]/84 px-4 py-2 text-sm font-medium text-slate-100 backdrop-blur-md md:flex">
          <span className="h-2 w-2 rounded-full bg-[#f6a63c] shadow-[0_0_12px_rgba(246,166,60,0.75)]" />
          Week one already mapped
        </div>

        <div className="pointer-events-none absolute left-[10%] top-[15%] hidden rounded-full border border-[#6ea8ff]/25 bg-[#0b1728]/75 p-2 backdrop-blur-md lg:block">
          <ArcMark className="h-5 w-5 text-blue-100/90" />
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-[#314d74] bg-[#091626]">
          <img
            src="/arc-personal-galaxy.png"
            alt="Arc dashboard showing the Personal Galaxy view with goals, skills, and the timeline mode."
            width={2068}
            height={1558}
            sizes="(max-width: 1024px) 100vw, 52vw"
            className="block w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,29,0.02),rgba(6,17,29,0.22))]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-7 pb-7">
          <div className="max-w-md rounded-[18px] border border-white/10 bg-[#07111f]/82 px-5 py-4 backdrop-blur-md transition-transform duration-300 ease-out group-hover:-translate-y-1">
            <p className="text-sm font-medium text-blue-100/72">Your Personal Galaxy</p>
            <p className="mt-2 text-lg font-medium leading-7 text-white">
              See goals, skills, and progress in one live system.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-[16px] border border-white/10 bg-[#07111f]/82 px-4 py-3 text-sm font-medium text-slate-100 backdrop-blur-md transition-transform duration-300 ease-out group-hover:-translate-y-1 lg:flex">
            Enter Arc
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}
