"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { useConvex } from "convex/react";
import { api } from "../convex/_generated/api";
import { Link } from "react-router-dom";
import { clearAuthIntent, storeAuthIntent } from "./lib/analytics";
import {
  prepareGuestSession,
  getWindowOrigin,
} from "./lib/browser";
import {
  authInputClassName,
  authPrimaryButtonClassName,
  authTextLinkClassName,
} from "./components/auth/authStyles";

export function SignInForm({
  onSignUpSuccess,
  onGuestSuccess,
  showGuestOption = true,
}: {
  onSignUpSuccess?: () => void;
  onGuestSuccess?: () => void;
  showGuestOption?: boolean;
}) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
  const [submitting, setSubmitting] = useState(false);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const convex = useConvex();
  const googleRedirectTo = `${getWindowOrigin()}/auth`;
  const isSignIn = flow === "signIn";
  const isBusy = submitting || guestSubmitting;

  return (
    <div className="w-full">
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-[14px] border border-[oklch(78%_0.032_116)] bg-[oklch(99%_0.008_116)] p-1 shadow-[0_12px_28px_rgba(29,44,35,0.08)]">
        <button
          type="button"
          onClick={() => setFlow("signUp")}
          className={`rounded-[10px] px-4 py-3 text-base font-bold transition-[background-color,color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)] ${
            !isSignIn
              ? "bg-[oklch(40%_0.1_153)] text-white"
              : "text-[oklch(37%_0.04_145)] hover:text-[oklch(24%_0.06_145)]"
          }`}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => setFlow("signIn")}
          className={`rounded-[10px] px-4 py-3 text-base font-bold transition-[background-color,color] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)] ${
            isSignIn
              ? "bg-[oklch(40%_0.1_153)] text-white"
              : "text-[oklch(37%_0.04_145)] hover:text-[oklch(24%_0.06_145)]"
          }`}
        >
          Sign in
        </button>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          const email = formData.get("email") as string;

          if (flow === "signUp") {
            convex.query(api.users.getUserByEmail, { email }).then((existingUser) => {
              if (existingUser) {
                toast.error("An account with this email already exists.");
                setSubmitting(false);
              } else {
                storeAuthIntent({ flow, method: "password" });
                formData.set("flow", flow);
                void signIn("password", formData)
                  .then(() => {
                    if (onSignUpSuccess) {
                      onSignUpSuccess();
                    }
                  })
                  .catch((error) => {
                    console.error(error);
                    clearAuthIntent();
                    toast.error(
                      "Could not sign up, did you mean to sign in?"
                    );
                  })
                  .finally(() => setSubmitting(false));
              }
            });
          } else {
            storeAuthIntent({ flow, method: "password" });
            formData.set("flow", flow);
            void signIn("password", formData)
              .then(() => undefined)
              .catch((error) => {
                console.error(error);
                clearAuthIntent();
                const errorMessage = error.message || error.toString();
                if (errorMessage.includes("Invalid password") || errorMessage.includes("InvalidSecret")) {
                  toast.error("Password incorrect. Please try again.");
                } else {
                  toast.error(
                    "Could not sign in, did you mean to sign up?"
                  );
                }
              })
              .finally(() => setSubmitting(false));
          }
        }}
      >
        <div className="space-y-2">
          <label htmlFor="auth-email" className="text-base font-bold text-[oklch(37%_0.04_145)]">
            Email address
          </label>
          <input
            id="auth-email"
            className={authInputClassName}
            type="email"
            name="email"
            placeholder="name@email.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="auth-password" className="text-base font-bold text-[oklch(37%_0.04_145)]">
            Password
          </label>
          <input
            id="auth-password"
            className={authInputClassName}
            type="password"
            name="password"
            placeholder={isSignIn ? "Enter your password" : "Create a password"}
            required
          />
        </div>

        {isSignIn && (
          <div className="text-right">
            <Link
              to="/forgot-password"
              className={authTextLinkClassName}
            >
              Forgot password?
            </Link>
          </div>
        )}
        <button
          className={authPrimaryButtonClassName}
          type="submit"
          disabled={isBusy}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {isSignIn ? "Signing in..." : "Creating account..."}
            </span>
          ) : (
            isSignIn ? "Sign in" : "Create account"
          )}
        </button>
        <div className="text-center text-sm text-slate-400">
          <span>
            {isSignIn
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="cursor-pointer font-bold text-[oklch(35%_0.085_153)] transition-colors hover:text-[oklch(24%_0.06_145)] focus-visible:outline-none focus-visible:text-[oklch(24%_0.06_145)]"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {isSignIn ? "Create account" : "Sign in"}
          </button>
        </div>
      </form>
      <div className="my-6 flex items-center justify-center">
        <hr className="my-4 grow border-[oklch(85%_0.032_116)]" />
        <span className="mx-4 text-sm font-bold text-[oklch(43%_0.045_145)]">
          Or use
        </span>
        <hr className="my-4 grow border-[oklch(85%_0.032_116)]" />
      </div>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-[oklch(78%_0.032_116)] bg-white px-6 py-4 text-base font-bold text-[oklch(22%_0.035_145)] shadow-[0_14px_30px_rgba(29,44,35,0.10)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[oklch(57%_0.08_153)] hover:shadow-[0_18px_40px_rgba(29,44,35,0.14)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[oklch(76%_0.12_82)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(97%_0.018_116)]"
          disabled={isBusy}
          onClick={() => {
            storeAuthIntent({ flow, method: "google" });
            void signIn("google", { 
              redirectTo: googleRedirectTo,
            }).then(() => {
              if (flow === "signUp" && onSignUpSuccess) {
                onSignUpSuccess();
              }
            }).catch((error) => {
              console.error("Google sign-in failed:", error);
              clearAuthIntent();
              toast.error("Failed to sign in with Google");
            });
          }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isSignIn ? "Sign in with Google" : "Create account with Google"}
        </button>
        {showGuestOption ? (
        <div className="pt-1 text-center">
          <p className="text-sm font-semibold text-[oklch(43%_0.045_145)]">
            Just looking around?
          </p>
          <button
            type="button"
            disabled={isBusy}
            className="mt-2 text-base font-bold text-[oklch(35%_0.085_153)] transition-colors hover:text-[oklch(24%_0.06_145)] focus-visible:outline-none focus-visible:text-[oklch(24%_0.06_145)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              setGuestSubmitting(true);
              clearAuthIntent();
              prepareGuestSession();
              storeAuthIntent({ flow: "signUp", method: "anonymous" });
              void signIn("anonymous")
                .then(() => {
                  onGuestSuccess?.();
                })
                .catch((error) => {
                  console.error("Guest sign-in failed:", error);
                  clearAuthIntent();
                  toast.error("Could not open guest mode right now. Please try again.");
                })
                .finally(() => {
                  setGuestSubmitting(false);
                });
            }}
          >
            {guestSubmitting ? "Opening DayBridge..." : "Use temporary guest mode"}
          </button>
        </div>
        ) : null}
      </div>
    </div>
  );
}
