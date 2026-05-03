import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  HeartHandshake,
  Home,
  MessageCircle,
  Pill,
  ShieldCheck,
  SunMedium,
  Users,
} from "lucide-react";
import { getAttribution, trackEvent } from "./lib/analytics";
import { getLocationSearch } from "./lib/browser";
import { usePageMetadata } from "./components/RouteMetadataManager";
import { ArcMark } from "./components/ArcMark";
import type {
  LandingActionHandlers,
  LandingActionState,
} from "./components/marketing/LandingActionController";

const primaryCtaClass =
  "group inline-flex min-h-14 items-center justify-center gap-3 rounded-[12px] border border-[oklch(45%_0.09_153)] bg-[oklch(40%_0.1_153)] px-7 py-4 text-base font-bold text-white shadow-[0_18px_34px_rgba(28,92,61,0.22)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[oklch(34%_0.105_153)] hover:shadow-[0_24px_44px_rgba(28,92,61,0.27)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)]";

const secondaryCtaClass =
  "group inline-flex min-h-14 items-center justify-center gap-3 rounded-[12px] border border-[oklch(78%_0.032_116)] bg-[oklch(99%_0.008_116)] px-7 py-4 text-base font-bold text-[oklch(25%_0.045_145)] shadow-[0_12px_28px_rgba(29,44,35,0.08)] transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-[oklch(57%_0.08_153)] hover:bg-white active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)]";

const dailyMoments = [
  {
    index: "01",
    title: "Morning clarity",
    description:
      "A large-type checklist gathers medication reminders, appointments, meals, and errands into one calm day view.",
  },
  {
    index: "02",
    title: "One-tap check-ins",
    description:
      "Seniors can mark done, ask for help, or send an 'I'm okay' signal without hunting through texts and portals.",
  },
  {
    index: "03",
    title: "Care circle visibility",
    description:
      "Family and helpers see the important signals without needing constant interruption or guesswork.",
  },
  {
    index: "04",
    title: "Evening handoff",
    description:
      "DayBridge turns the day into a simple summary: what happened, what moved, and what needs attention tomorrow.",
  },
];

const supportCards = [
  {
    icon: Pill,
    title: "Medication-safe reminders",
    description:
      "DayBridge can remind someone to take medicine as already prescribed, but it never recommends treatment or dosage changes.",
  },
  {
    icon: CalendarCheck,
    title: "Appointments and rides",
    description:
      "Plans can include doctor visits, transportation prep, paperwork, and the small steps that often get missed.",
  },
  {
    icon: MessageCircle,
    title: "Gentle caregiver updates",
    description:
      "Instead of three family members calling at once, the care circle gets a quiet update when something is done or stuck.",
  },
  {
    icon: ShieldCheck,
    title: "Built for accessibility",
    description:
      "Large controls, plain labels, high contrast, and fewer choices reduce the friction older adults face in daily apps.",
  },
];

const promptFitCards = [
  {
    icon: Users,
    title: "Who we are designing for",
    description:
      "Older adults who live independently, especially seniors who juggle appointments, medication routines, errands, and family check-ins.",
  },
  {
    icon: BellRing,
    title: "The problem",
    description:
      "Daily support is scattered across sticky notes, phone calls, texts, medical portals, and memory. The tiny steps between 'remember' and 'done' are easy to lose.",
  },
  {
    icon: Home,
    title: "Why it matters",
    description:
      "Small misses can cost independence, confidence, and family peace of mind. Existing productivity tools are usually built for younger workers, not this day-to-day reality.",
  },
  {
    icon: HeartHandshake,
    title: "How DayBridge helps",
    description:
      "It turns the day into a shared, accessible routine board so seniors can act independently and caregivers can support without hovering.",
  },
];

const sampleDay = [
  {
    time: "8:00 AM",
    label: "Take morning medication as prescribed",
    helper: "Large reminder plus optional caregiver confirmation",
    status: "Done",
  },
  {
    time: "10:30 AM",
    label: "Put insurance card by the door",
    helper: "Prep step before afternoon appointment",
    status: "Next",
  },
  {
    time: "1:15 PM",
    label: "Ride arrives for clinic visit",
    helper: "Notify care circle if pickup is delayed",
    status: "Scheduled",
  },
  {
    time: "6:00 PM",
    label: "Call Maya after dinner",
    helper: "Connection reminder, not just chores",
    status: "Tonight",
  },
];

const careSignals = [
  "Checked in this morning",
  "Appointment prep still open",
  "No missed essentials today",
];

const faqItems = [
  {
    question: "Is DayBridge medical advice?",
    answer:
      "No. DayBridge is a routine and communication tool. It can remind someone about instructions they already have, but it does not diagnose, prescribe, or change care plans.",
  },
  {
    question: "Why not use a normal task app?",
    answer:
      "Most task apps assume fast typing, tiny controls, productivity jargon, and solo use. DayBridge is built around plain language, shared visibility, and the slower texture of daily care.",
  },
  {
    question: "Who else can use it?",
    answer:
      "Family members, neighbors, aides, and volunteers can use the care circle view to coordinate help while keeping the senior's independence at the center.",
  },
];

const landingPageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "DayBridge",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    url: "https://daybridge.app/",
    description:
      "DayBridge helps older adults living independently manage daily routines, appointments, medication reminders, and caregiver check-ins.",
    audience: {
      "@type": "PeopleAudience",
      suggestedMinAge: 60,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

const LandingActionController = lazy(async () => {
  const module = await import("./components/marketing/LandingActionController");
  return { default: module.LandingActionController };
});

const emptyLandingActionState: LandingActionState = {
  status: "idle",
  error: null,
  retry: () => undefined,
  dismiss: () => undefined,
};

function DayBridgePreview({
  onOpen,
}: {
  onOpen: (placement: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen("hero_day_board_preview")}
      className="w-full rounded-[16px] border border-[oklch(82%_0.035_115)] bg-[oklch(99%_0.009_115)] p-4 text-left shadow-[0_28px_70px_rgba(24,42,31,0.16)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)]"
      aria-label="Open the DayBridge demo from the daily board preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] bg-[oklch(94%_0.035_116)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[oklch(36%_0.1_153)] text-white">
            <SunMedium className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-[oklch(24%_0.045_145)]">
              Today for Elaine
            </p>
            <p className="text-sm font-medium text-[oklch(42%_0.05_150)]">
              Wednesday, independent living
            </p>
          </div>
        </div>
        <div className="rounded-[999px] border border-[oklch(72%_0.08_153)] bg-white px-4 py-2 text-sm font-bold text-[oklch(31%_0.08_153)]">
          3 of 4 essentials on track
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {sampleDay.map((item) => (
          <div
            key={`${item.time}-${item.label}`}
            className="grid gap-3 rounded-[12px] border border-[oklch(86%_0.025_116)] bg-white p-4 sm:grid-cols-[88px_1fr_auto] sm:items-center"
          >
            <p className="text-base font-bold text-[oklch(34%_0.075_153)]">
              {item.time}
            </p>
            <div>
              <p className="text-lg font-bold leading-6 text-[oklch(22%_0.035_145)]">
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-[oklch(47%_0.035_145)]">
                {item.helper}
              </p>
            </div>
            <span className="inline-flex min-h-10 items-center justify-center rounded-[999px] bg-[oklch(93%_0.055_95)] px-4 text-sm font-bold text-[oklch(35%_0.08_75)]">
              {item.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 rounded-[12px] bg-[oklch(96%_0.017_210)] p-4 sm:grid-cols-3">
        {careSignals.map((signal) => (
          <div key={signal} className="flex items-center gap-2 text-sm font-bold text-[oklch(28%_0.055_210)]">
            <CheckCircle2 className="h-4 w-4 text-[oklch(44%_0.1_153)]" />
            <span>{signal}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const hasTrackedLandingView = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const [landingActions, setLandingActions] = useState<LandingActionHandlers | null>(null);
  const [guestStartUi, setGuestStartUi] = useState<LandingActionState>(emptyLandingActionState);

  usePageMetadata({
    title: "DayBridge | Daily Support Planner for Seniors",
    description:
      "DayBridge helps older adults living independently manage daily routines, appointments, medication reminders, and caregiver check-ins.",
    robots: "index, follow",
    canonicalPath: "/",
    schema: landingPageSchema,
  });

  useEffect(() => {
    if (hasTrackedLandingView.current) {
      return;
    }

    hasTrackedLandingView.current = true;
    trackEvent("landing_view", {
      ...getAttribution(getLocationSearch()),
      product: "daybridge",
    });
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuthCta = useCallback(
    (placement: string) => {
      if (landingActions) {
        landingActions.handleAuthCta(placement);
        return;
      }

      navigate(`/auth?utm_source=landing&utm_medium=${placement}&utm_campaign=daybridge_launch`);
    },
    [landingActions, navigate],
  );

  const handleTryDayBridgeCta = useCallback(
    async (placement: string) => {
      if (landingActions) {
        await landingActions.handleTryArcCta(placement);
        return;
      }

      navigate(`/auth?utm_source=landing&utm_medium=${placement}&utm_campaign=daybridge_launch`);
    },
    [landingActions, navigate],
  );

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const preloadController = window.setTimeout(() => {
      void import("./components/marketing/LandingActionController");
    }, 1);

    return () => window.clearTimeout(preloadController);
  }, [isClient]);

  return (
    <div className="min-h-screen bg-[oklch(97%_0.018_116)] text-[oklch(22%_0.035_145)]">
      {isClient ? (
        <Suspense fallback={null}>
          <LandingActionController
            onReady={setLandingActions}
            onStateChange={setGuestStartUi}
          />
        </Suspense>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-[oklch(85%_0.032_116)] bg-[oklch(97%_0.018_116)]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[oklch(36%_0.1_153)] text-white">
              <ArcMark className="h-7 w-7" title="DayBridge" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-normal text-[oklch(22%_0.035_145)]">
                DayBridge
              </p>
              <p className="text-sm font-semibold text-[oklch(43%_0.045_145)]">
                Daily support for seniors
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-8 text-base font-semibold text-[oklch(37%_0.04_145)] md:flex">
            <a className="hover:text-[oklch(24%_0.06_145)] focus-visible:outline-none" href="#daily-life">
              Daily life
            </a>
            <a className="hover:text-[oklch(24%_0.06_145)] focus-visible:outline-none" href="#how-it-works">
              How it works
            </a>
            <a className="hover:text-[oklch(24%_0.06_145)] focus-visible:outline-none" href="#safety">
              Safety
            </a>
          </nav>

          <button
            onClick={() => handleAuthCta("nav_cta")}
            className="hidden rounded-[12px] border border-[oklch(45%_0.09_153)] bg-[oklch(40%_0.1_153)] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[oklch(34%_0.105_153)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] md:inline-flex"
          >
            Create account
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:px-8 lg:pb-14 lg:pt-16">
          <div>
            <p className="max-w-xl text-lg font-bold leading-8 text-[oklch(35%_0.085_153)]">
              Built for older adults whose day is shaped by routines, rides,
              reminders, and check-ins.
            </p>

            <h1 className="mt-5 text-6xl font-black leading-none tracking-normal text-[oklch(21%_0.035_145)] md:text-7xl">
              DayBridge
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-9 text-[oklch(36%_0.035_145)]">
              A senior-friendly daily board that turns appointments, medication
              reminders, errands, and family support into one plain, shared plan.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleTryDayBridgeCta("hero_try_demo")}
                className={primaryCtaClass}
              >
                Try the daily board
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => handleAuthCta("hero_create_account")}
                className={secondaryCtaClass}
              >
                Save a care plan
                <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>

            <p className="mt-5 max-w-xl text-base leading-7 text-[oklch(43%_0.035_145)]">
              Designed for independence first: caregivers get enough context to help,
              while the senior still owns the day.
            </p>
          </div>

          <DayBridgePreview onOpen={(placement) => void handleTryDayBridgeCta(placement)} />
        </section>

        <section
          id="daily-life"
          className="border-y border-[oklch(86%_0.03_116)] bg-white px-5 py-16 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-base font-bold text-[oklch(36%_0.085_153)]">
                What their day looks like
              </p>
              <h2 className="mt-3 max-w-xl text-4xl font-black leading-tight tracking-normal text-[oklch(22%_0.035_145)] md:text-5xl">
                The hard part is not one task. It is the handoff between tasks.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[oklch(40%_0.035_145)]">
                A senior might remember the appointment but forget the paperwork,
                remember the pill but miss the refill, or wait to ask for help
                because the next call feels like a burden.
              </p>
            </div>

            <div className="grid gap-4">
              {dailyMoments.map((item) => (
                <div
                  key={item.index}
                  className="grid gap-4 rounded-[12px] border border-[oklch(86%_0.03_116)] bg-[oklch(98%_0.01_116)] p-5 sm:grid-cols-[56px_1fr]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[oklch(36%_0.1_153)] text-lg font-black text-white">
                    {item.index}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-normal text-[oklch(22%_0.035_145)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-[oklch(42%_0.035_145)]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-5 py-16 lg:px-8"
        >
          <div className="max-w-3xl">
            <p className="text-base font-bold text-[oklch(36%_0.085_153)]">
              Understanding the need
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-normal text-[oklch(22%_0.035_145)] md:text-5xl">
              Built for a daily life very different from ours.
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {promptFitCards.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[12px] border border-[oklch(84%_0.03_116)] bg-[oklch(99%_0.008_116)] p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[oklch(93%_0.055_95)] text-[oklch(33%_0.085_75)]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl font-black tracking-normal text-[oklch(22%_0.035_145)]">
                  {title}
                </h3>
                <p className="mt-3 text-base leading-7 text-[oklch(42%_0.035_145)]">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="safety"
          className="bg-[oklch(23%_0.04_145)] px-5 py-16 text-white lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-base font-bold text-[oklch(81%_0.12_82)]">
                What the product does
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-normal md:text-5xl">
                Practical support without pretending to be a doctor.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[oklch(86%_0.02_135)]">
                DayBridge focuses on reminders, planning, and communication. It
                stays away from diagnosis, treatment, and dosage decisions.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {supportCards.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-[12px] border border-white/15 bg-white/8 p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[oklch(81%_0.12_82)] text-[oklch(22%_0.035_145)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-normal">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[oklch(85%_0.02_135)]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[12px] border border-[oklch(84%_0.03_116)] bg-white p-7">
              <p className="text-base font-bold text-[oklch(36%_0.085_153)]">
                Common questions
              </p>
              <div className="mt-6 grid gap-4">
                {faqItems.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-[12px] border border-[oklch(88%_0.025_116)] bg-[oklch(98%_0.01_116)] p-5"
                  >
                    <h3 className="text-xl font-black tracking-normal text-[oklch(22%_0.035_145)]">
                      {item.question}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-[oklch(42%_0.035_145)]">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[12px] border border-[oklch(44%_0.09_153)] bg-[oklch(36%_0.1_153)] p-7 text-white">
              <ClipboardCheck className="h-10 w-10 text-[oklch(84%_0.12_82)]" />
              <h2 className="mt-6 text-4xl font-black leading-tight tracking-normal md:text-5xl">
                Start with today, then make tomorrow easier.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[oklch(91%_0.02_135)]">
                DayBridge turns a care need into a shared, plain-language
                plan — with AI-assisted checkpoints, caregiver visibility,
                and accessibility built in from the start.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => void handleTryDayBridgeCta("final_demo_cta")}
                  className="group inline-flex min-h-14 items-center justify-center gap-3 rounded-[12px] border border-white/20 bg-white px-7 py-4 text-base font-black text-[oklch(30%_0.08_153)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(83%_0.12_82)]"
                >
                  Open demo
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[oklch(78%_0.04_116)] bg-white px-4 py-3 shadow-[0_18px_40px_rgba(24,42,31,0.2)]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-[oklch(38%_0.08_153)]">
              DayBridge demo
            </p>
            <p className="mt-1 truncate text-base font-black text-[oklch(22%_0.035_145)]">
              Open the daily board
            </p>
          </div>
          <button
            onClick={() => void handleTryDayBridgeCta("mobile_dock")}
            className="inline-flex shrink-0 items-center gap-2 rounded-[12px] bg-[oklch(40%_0.1_153)] px-4 py-3 text-sm font-black text-white"
          >
            Try
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {guestStartUi.status !== "idle" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(18%_0.04_145)]/84 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[16px] border border-white/15 bg-[oklch(97%_0.018_116)] p-8 text-center shadow-[0_28px_90px_rgba(10,24,16,0.5)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[12px] bg-[oklch(36%_0.1_153)] text-white">
              <ArcMark className="h-8 w-8" title="DayBridge" />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-normal text-[oklch(22%_0.035_145)]">
              Opening DayBridge...
            </h2>
            <p className="mt-3 text-base leading-7 text-[oklch(42%_0.035_145)]">
              Taking you straight into the daily support board.
            </p>

            {guestStartUi.status === "error" ? (
              <div className="mt-6 space-y-3">
                <p className="text-base leading-7 text-[oklch(45%_0.12_25)]">
                  {guestStartUi.error}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={guestStartUi.retry}
                    className="rounded-[12px] bg-[oklch(40%_0.1_153)] px-5 py-3 text-base font-bold text-white"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={guestStartUi.dismiss}
                    className="rounded-[12px] border border-[oklch(78%_0.032_116)] bg-white px-5 py-3 text-base font-bold text-[oklch(25%_0.045_145)]"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[oklch(40%_0.1_153)]" />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
