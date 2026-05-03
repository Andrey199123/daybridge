import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import {
  clearAuthIntent,
  storeAuthIntent,
  trackEvent,
} from "../../lib/analytics";
import {
  GUEST_MODE_KEY,
  prepareGuestSession,
  readSessionStorage,
} from "../../lib/browser";

export type LandingActionHandlers = {
  handleAuthCta: (placement: string) => void;
  handleTryArcCta: (placement: string) => Promise<void>;
};

export type LandingActionState = {
  status: "idle" | "loading" | "error";
  error: string | null;
  retry: () => void;
  dismiss: () => void;
};

type LandingActionControllerProps = {
  onReady: (handlers: LandingActionHandlers | null) => void;
  onStateChange: (state: LandingActionState) => void;
};

export function LandingActionController({
  onReady,
  onStateChange,
}: LandingActionControllerProps) {
  const navigate = useNavigate();
  const guestStartAttempts = useRef(0);
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [guestStartState, setGuestStartState] = useState<"idle" | "loading" | "error">("idle");
  const [guestStartError, setGuestStartError] = useState<string | null>(null);

  useEffect(() => {
    if (guestStartState !== "loading" || currentUser?.isAnonymous !== true) {
      return;
    }

    navigate("/dashboard");
  }, [currentUser?.isAnonymous, guestStartState, navigate]);

  const handleAuthCta = useCallback(
    (placement: string) => {
      const isGuestSession =
        readSessionStorage(GUEST_MODE_KEY) === "true" ||
        currentUser?.isAnonymous === true;
      const destination = isGuestSession
        ? `/auth?upgrade=guest&utm_source=landing&utm_medium=${placement}&utm_campaign=guest_upgrade`
        : `/auth?utm_source=landing&utm_medium=${placement}&utm_campaign=launch_funnel`;

      trackEvent("landing_cta_click", {
        placement,
        destination,
      });

      navigate(destination);
    },
    [currentUser?.isAnonymous, navigate],
  );

  const handleTryArcCta = useCallback(
    async (placement: string) => {
      const destination = "/missions";

      trackEvent("landing_cta_click", {
        placement,
        destination,
        mode: "guest",
      });

      if (isAuthenticated && currentUser && currentUser.isAnonymous !== true) {
        navigate(destination);
        return;
      }

      if (currentUser?.isAnonymous === true) {
        navigate(destination);
        return;
      }

      guestStartAttempts.current = 0;
      prepareGuestSession();
      setGuestStartState("loading");
      setGuestStartError(null);

      const openGuestSession = async () => {
        guestStartAttempts.current += 1;

        try {
          clearAuthIntent();
          storeAuthIntent({ flow: "signUp", method: "anonymous" });
          await signIn("anonymous");
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("Landing guest sign-in failed:", error);

          if (
            message.includes("Connection lost while action was in flight") &&
            guestStartAttempts.current < 3
          ) {
            window.setTimeout(() => {
              void openGuestSession();
            }, 900);
            return;
          }

          clearAuthIntent();
          setGuestStartState("error");
          setGuestStartError("DayBridge lost connection while opening your guest session. Try again.");
        }
      };

      await openGuestSession();
    },
    [currentUser, isAuthenticated, navigate, signIn],
  );

  const retry = useCallback(() => {
    guestStartAttempts.current = 0;
    void handleTryArcCta("guest_retry");
  }, [handleTryArcCta]);

  const dismiss = useCallback(() => {
    setGuestStartState("idle");
    setGuestStartError(null);
  }, []);

  useEffect(() => {
    onReady({
      handleAuthCta,
      handleTryArcCta,
    });

    return () => onReady(null);
  }, [handleAuthCta, handleTryArcCta, onReady]);

  useEffect(() => {
    onStateChange({
      status: guestStartState,
      error: guestStartError,
      retry,
      dismiss,
    });
  }, [dismiss, guestStartError, guestStartState, onStateChange, retry]);

  return null;
}
