import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../convex/_generated/api";
import { ProcessTimeline } from "./components/marketing/ProcessTimeline";
import { AuthSplitShell } from "./components/auth/AuthSplitShell";
import { SignInForm } from "./SignInForm";
import {
  clearAuthIntent,
  getAttribution,
  readAuthIntent,
  trackEvent,
  type AuthIntent,
} from "./lib/analytics";
import {
  clearGuestSession,
  GUEST_MODE_KEY,
  readSessionStorage,
  removeSessionStorage,
  writeSessionStorage,
} from "./lib/browser";

const authSummaryRows = [
  {
    index: "01",
    title: "Clarify the day",
    description: "DayBridge asks what needs to happen, who can help, and when each step matters.",
  },
  {
    index: "02",
    title: "Map the care plan",
    description: "The planner breaks appointments, routines, and errands into clear checkpoints.",
  },
  {
    index: "03",
    title: "Share the signal",
    description: "Seniors can mark progress and caregivers can see what needs attention.",
  },
];

const OnboardingWizard = lazy(async () => {
  const module = await import("./components/OnboardingWizard");
  return { default: module.OnboardingWizard };
});

export function AuthPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [lastAuthIntent, setLastAuthIntent] = useState<AuthIntent | null>(null);
  const saveProgress = useMutation(api.users.saveOnboardingProgress);
  const ensureGuestProfile = useMutation(api.users.ensureGuestProfile);
  const hasTrackedOnboardingStart = useRef(false);
  const isGuestUpgrade =
    new URLSearchParams(location.search).get("upgrade") === "guest" &&
    (readSessionStorage(GUEST_MODE_KEY) === "true" || currentUser?.isAnonymous === true);

  useEffect(() => {
    trackEvent("auth_view", getAttribution(location.search));
  }, [location.search]);

  useEffect(() => {
    if (isAuthenticated && currentUser && !currentUser.profile && !profileInitialized) {
      const initializeProfile = currentUser.isAnonymous
        ? ensureGuestProfile()
        : saveProgress({
            step: 0,
            data: {
              interests: undefined,
              motivationLevel: undefined,
              skills: undefined,
              programs: undefined,
              awards: undefined,
              grade: undefined,
              birthday: undefined,
              city: undefined,
              state: undefined,
              schoolName: undefined,
              schoolCity: undefined,
              schoolState: undefined,
              gender: undefined,
              raceEthnicity: undefined,
            },
          });

      initializeProfile
        .then(() => {
          setProfileInitialized(true);
        })
        .catch((error) => {
          console.error("Failed to initialize profile for new user:", error);
        });
    }
  }, [currentUser, ensureGuestProfile, isAuthenticated, profileInitialized, saveProgress]);

  useEffect(() => {
    if (!isAuthenticated || currentUser === undefined) {
      return;
    }

    const authIntent = readAuthIntent();
    if (!authIntent) {
      return;
    }

    setLastAuthIntent(authIntent);

    if (authIntent.method === "anonymous") {
      trackEvent("guest_session_started", { method: authIntent.method });
    } else if (authIntent.flow === "signUp") {
      trackEvent("signup_success", { method: authIntent.method });
    } else {
      trackEvent("login_success", { method: authIntent.method });
    }

    clearAuthIntent();
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    if (
      isAuthenticated &&
      currentUser?.profile &&
      !currentUser.profile.completedOnboarding &&
      showOnboarding &&
      !hasTrackedOnboardingStart.current
    ) {
      trackEvent("onboarding_start", {
        method: lastAuthIntent?.method || "unknown",
        flow: lastAuthIntent?.flow || "unknown",
      });
      hasTrackedOnboardingStart.current = true;
    }
  }, [currentUser, isAuthenticated, lastAuthIntent, showOnboarding]);

  useEffect(() => {
    if (
      !isGuestUpgrade ||
      !isAuthenticated ||
      !currentUser?.profile ||
      currentUser.profile.completedOnboarding ||
      showOnboarding ||
      !lastAuthIntent ||
      lastAuthIntent.method === "anonymous"
    ) {
      return;
    }

    clearGuestSession();
    removeSessionStorage("skipOnboarding");
    setShowOnboarding(true);
  }, [currentUser, isAuthenticated, isGuestUpgrade, lastAuthIntent, showOnboarding]);

  if (
    isLoading ||
    (isAuthenticated && currentUser === undefined) ||
    (isAuthenticated && currentUser && !currentUser.profile && !profileInitialized)
  ) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
      </div>
    );
  }

  if (isAuthenticated && currentUser?.profile?.completedOnboarding === true) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated && currentUser?.isAnonymous && !isGuestUpgrade) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated && currentUser?.profile && !currentUser.profile.completedOnboarding) {
    if (showOnboarding) {
      return (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-[oklch(97%_0.018_116)]">
              <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-[oklch(40%_0.1_153)]" />
            </div>
          }
        >
          <OnboardingWizard
            onComplete={() => {
              removeSessionStorage("skipOnboarding");
              clearGuestSession();
              navigate("/dashboard", { replace: true });
            }}
          />
        </Suspense>
      );
    }

    if (!isGuestUpgrade) {
      return (
        <div className="min-h-screen bg-[oklch(97%_0.018_116)] text-[oklch(22%_0.035_145)]">
          <div className="mx-auto max-w-xl px-6 py-16">
            <div className="rounded-[18px] border border-[oklch(85%_0.032_116)] bg-white/90 p-8 shadow-[0_28px_70px_rgba(24,42,31,0.14)] backdrop-blur">
              <p className="text-base font-bold text-[oklch(35%_0.085_153)]">
                Welcome back
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight text-[oklch(21%_0.035_145)]">
                Finish setting up DayBridge
              </h1>
              <p className="mt-4 text-lg leading-8 text-[oklch(40%_0.04_145)]">
                You started onboarding but did not finish. Want to continue where you left off?
              </p>

              <div className="mt-8 grid gap-3">
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="inline-flex min-h-12 items-center justify-center rounded-[12px] border border-[oklch(45%_0.09_153)] bg-[oklch(40%_0.1_153)] px-6 py-4 text-base font-bold text-white transition-colors hover:bg-[oklch(34%_0.105_153)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)]"
                >
                  Continue setup
                </button>
                <button
                  onClick={() => {
                    writeSessionStorage("skipOnboarding", "true");
                    navigate("/dashboard", { replace: true });
                  }}
                  className="inline-flex min-h-12 items-center justify-center rounded-[12px] border border-[oklch(78%_0.032_116)] bg-[oklch(99%_0.008_116)] px-6 py-4 text-base font-bold text-[oklch(25%_0.045_145)] transition-[border-color,background-color] hover:border-[oklch(57%_0.08_153)] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)]"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <AuthSplitShell
      leftEyebrow={
        isGuestUpgrade
          ? "Keep the care plan you just created."
          : "Create your account first. Build the day inside DayBridge."
      }
      leftTitle={
        isGuestUpgrade
          ? "Turn this guest session into your real DayBridge account."
          : "Start your account and get to the first useful day plan."
      }
      leftDescription={
        isGuestUpgrade
          ? "You already tried DayBridge and created a plan. Create a real account so that plan, your updates, and everything after it stays with you."
          : "DayBridge is for older adults and care circles who need routines, appointments, reminders, and help requests in one readable place."
      }
      leftPanel={
        <>
          <p className="text-sm font-bold text-[oklch(35%_0.085_153)]">
            What happens next
          </p>
          <ProcessTimeline items={authSummaryRows} compact className="mt-3" />
          <p className="mt-6 text-sm leading-7 text-[oklch(43%_0.045_145)]">
            The goal is to get people to a useful day board quickly, not trap them in setup.
          </p>
        </>
      }
      leftFooter={
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-base font-bold text-[oklch(37%_0.04_145)] transition-colors hover:text-[oklch(24%_0.06_145)] focus-visible:outline-none focus-visible:text-[oklch(24%_0.06_145)]"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to landing page
        </button>
      }
      rightEyebrow={isGuestUpgrade ? "Keep going" : "Secure access"}
      rightTitle={isGuestUpgrade ? "Create the real account" : "Welcome to DayBridge"}
      rightDescription={
        isGuestUpgrade
          ? "Use email or Google to keep the care plan you just created, then finish onboarding as a real user."
          : "Create an account to save care plans, daily tasks, and caregiver updates in one place. Guest access is still there if you just want a quick look."
      }
    >
      <p className="mb-6 text-base leading-8 text-[oklch(40%_0.04_145)]">
        {isGuestUpgrade
          ? "Create an account now, then finish onboarding as a real user."
          : "Create an account to save care plans, daily tasks, and caregiver updates in one place."}
      </p>
      <SignInForm
        onSignUpSuccess={() => {
          if (isGuestUpgrade) {
            clearGuestSession();
            removeSessionStorage("skipOnboarding");
          }
          setShowOnboarding(true);
        }}
        onGuestSuccess={() => undefined}
        showGuestOption={!isGuestUpgrade}
      />
    </AuthSplitShell>
  );
}
