import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { AuthSplitShell } from "./components/auth/AuthSplitShell";
import {
  authGhostLinkClassName,
  authInputClassName,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
} from "./components/auth/authStyles";
import { ProcessTimeline } from "./components/marketing/ProcessTimeline";
import { cn } from "./lib/utils";

const recoveryTimelineRows = [
  {
    index: "01",
    title: "Request the reset link",
    description: "Use the email on your Arc account and we will start the password recovery flow right away.",
  },
  {
    index: "02",
    title: "Open the secure email",
    description: "The message contains a single-use reset link so only the latest request stays active.",
  },
  {
    index: "03",
    title: "Choose a new password",
    description: "Set a fresh password, sign back in, and get straight back to your goals and weekly work.",
  },
];

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const requestReset = useAction(api.passwordResetActions.requestPasswordReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestReset({ email: normalizedEmail });
      setEmail(normalizedEmail);
      setEmailSent(true);
      toast.success("If that email is in Arc, a reset link is on its way.");
    } catch (error) {
      console.error("Error requesting password reset:", error);
      toast.error("Failed to send reset email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitShell
      leftEyebrow={emailSent ? "Recovery link prepared." : "Reset access without losing momentum."}
      leftTitle={emailSent ? "Check your inbox and get back into Arc." : "Get back into your Arc account."}
      leftDescription={
        emailSent
          ? "The recovery flow stays private and secure. Use the latest email from Arc, choose a new password, and your goals, tasks, and progress will be right where you left them."
          : "If you forgot your password, we will send a secure reset link so you can get back to your dashboard, current missions, and weekly plan without starting over."
      }
      leftPanel={
        <>
          <p className="text-sm font-medium text-blue-100/70">How password recovery works</p>
          <ProcessTimeline items={recoveryTimelineRows} compact className="mt-3" />
          <p className="mt-6 text-sm leading-7 text-slate-400">
            Reset links stay active for 1 hour and become invalid as soon as a newer request is sent or the password is changed.
          </p>
        </>
      }
      rightEyebrow={emailSent ? "Inbox check" : "Secure access"}
      rightTitle={emailSent ? "Check your email" : "Reset your password"}
      rightDescription={
        emailSent
          ? "For privacy, we always show the same confirmation state. The next step is to open the message from Arc and follow the reset link."
          : "Use the email address tied to your Arc account. We always show the same confirmation flow so password recovery stays private."
      }
    >
      {emailSent ? (
        <div className="rounded-[18px] border border-[#1f3554] bg-[#081423] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#35547c] bg-[#0d1c31] text-blue-200">
            <Mail className="h-6 w-6" />
          </div>

          <h3 className="arc-display mt-6 text-[2rem] font-semibold leading-tight text-white">
            Reset link on the way
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-slate-300">
            If an Arc account exists for <span className="font-medium text-white">{email}</span>, a reset link is on the way now.
          </p>

          <div className="mt-6 rounded-[16px] border border-[#1f3554] bg-[#0b1728] p-4 text-sm leading-7 text-slate-400">
            Check spam or promotions if it does not show up in a few minutes. Only the newest link stays valid, and it expires in 1 hour.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className={cn(authSecondaryButtonClassName, "sm:flex-1")}
            >
              Use another email
            </button>
            <Link
              to="/auth"
              className={cn(authPrimaryButtonClassName, "inline-flex items-center justify-center sm:flex-1")}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm leading-7 text-slate-400">
            Enter the email you use for Arc. If it matches an account, we will send a secure link with the next step.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-400">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className={authInputClassName}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(authPrimaryButtonClassName, "flex items-center justify-center gap-2")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  Send reset link
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 border-t border-[#1f3554] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-slate-500">
              Reset links expire in 1 hour and can only be used once.
            </p>
            <Link to="/auth" className={authGhostLinkClassName}>
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </AuthSplitShell>
  );
}
