import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { AuthSplitShell } from "./components/auth/AuthSplitShell";
import {
  authGhostLinkClassName,
  authInputClassName,
  authPrimaryButtonClassName,
  authSecondaryButtonClassName,
} from "./components/auth/authStyles";
import { ProcessTimeline } from "./components/marketing/ProcessTimeline";
import { cn } from "./lib/utils";

const resetTimelineRows = [
  {
    index: "01",
    title: "Open the latest secure link",
    description: "Use the newest reset email from DayBridge so you are working with the only active recovery link.",
  },
  {
    index: "02",
    title: "Set a fresh password",
    description: "Choose a password with at least 8 characters so your account is protected before you sign back in.",
  },
  {
    index: "03",
    title: "Return to your dashboard",
    description: "Sign in with the new password and pick up your daily plan where you left off.",
  },
];

type ResetLinkIssue = "missing" | "invalid" | "expired" | "used";

const resetIssueCopy: Record<
  ResetLinkIssue,
  {
    eyebrow: string;
    title: string;
    description: string;
    message: string;
  }
> = {
  missing: {
    eyebrow: "Missing link",
    title: "This reset link is incomplete",
    description: "The page opened without a password reset token, so there is no secure request for DayBridge to verify.",
    message: "Request a fresh password reset email and open the newest link from your inbox.",
  },
  invalid: {
    eyebrow: "Invalid link",
    title: "This reset link is not valid",
    description: "The recovery link does not match an active DayBridge password reset request anymore.",
    message: "Ask for a new reset email and use the latest link that DayBridge sends you.",
  },
  expired: {
    eyebrow: "Link expired",
    title: "This reset link has expired",
    description: "Password reset links stay active for 1 hour, then DayBridge closes them automatically for security.",
    message: "Request a fresh reset email and open it right away so you can choose a new password.",
  },
  used: {
    eyebrow: "Link already used",
    title: "This reset link has already been used",
    description: "That password reset request is already closed, so you will need a new secure link to change the password again.",
    message: "Request another reset email if you still need to update your password.",
  },
};

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const tokenVerification = useQuery(
    api.passwordReset.verifyResetToken,
    token && !resetSuccess ? { token } : "skip"
  );
  const resetPassword = useAction(api.passwordResetActions.resetPasswordWithAuth);
  const passwordsDoNotMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  useEffect(() => {
    if (!resetSuccess) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      navigate("/auth");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [navigate, resetSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setResetSuccess(true);
      toast.success("Password reset successfully!");

    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset password. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const issueKey: ResetLinkIssue | null = !token
    ? "missing"
    : tokenVerification && !tokenVerification.valid
      ? (tokenVerification.reason as Exclude<ResetLinkIssue, "missing">)
      : null;

  const issueCopy = issueKey ? resetIssueCopy[issueKey] : null;

  return (
    <AuthSplitShell
      leftEyebrow={resetSuccess ? "Access restored." : "Finish the password reset securely."}
      leftTitle={resetSuccess ? "Your DayBridge account is ready again." : "Choose a new password and get back to your day."}
      leftDescription={
        resetSuccess
          ? "Your password has been updated. Sign back in and pick up your daily plan without losing your place."
          : "This step closes the password recovery flow. Once the new password is saved, you can head straight back into DayBridge."
      }
      leftPanel={
        <>
          <p className="text-sm font-bold text-[oklch(35%_0.085_153)]">How the reset flow finishes</p>
          <ProcessTimeline items={resetTimelineRows} compact className="mt-3" />
          <p className="mt-6 text-sm leading-7 text-[oklch(43%_0.045_145)]">
            For security, DayBridge only keeps the newest recovery link active. If a link expires or is reused, request a fresh one and continue from there.
          </p>
        </>
      }
      rightEyebrow={
        resetSuccess
          ? "Password updated"
          : issueCopy
            ? issueCopy.eyebrow
            : tokenVerification === undefined
              ? "Verifying link"
              : "Secure access"
      }
      rightTitle={
        resetSuccess
          ? "Password reset complete"
          : issueCopy
            ? issueCopy.title
            : tokenVerification === undefined
              ? "Checking your reset link"
              : "Choose a new password"
      }
      rightDescription={
        resetSuccess
          ? "You can sign in with the new password right away. DayBridge will also send you back to the sign-in screen in a few seconds."
          : issueCopy
            ? issueCopy.description
            : tokenVerification === undefined
              ? "We are confirming that this recovery link is still active before we show the password form."
              : "Create a new password with at least 8 characters, then sign back in to return to your plan."
      }
    >
      {resetSuccess ? (
        <div className="rounded-[18px] border border-[oklch(85%_0.032_116)] bg-[oklch(99%_0.008_116)] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[oklch(78%_0.032_116)] bg-white text-[oklch(35%_0.085_153)] shadow-[0_12px_28px_rgba(29,44,35,0.10)]">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h3 className="arc-display mt-6 text-[2rem] font-black leading-tight text-[oklch(21%_0.035_145)]">
            Password updated
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-[oklch(40%_0.04_145)]">
            Your password has been reset successfully. You can use it immediately to sign back in to DayBridge.
          </p>

          <div className="mt-6 rounded-[16px] border border-[oklch(85%_0.032_116)] bg-white p-4 text-sm leading-7 text-[oklch(43%_0.045_145)]">
            Redirecting to sign in automatically. If you prefer, you can go there now.
          </div>

          <Link
            to="/auth"
            className={cn(authPrimaryButtonClassName, "mt-6 inline-flex items-center justify-center")}
          >
            Sign in now
          </Link>
        </div>
      ) : issueCopy ? (
        <div className="rounded-[18px] border border-[oklch(86%_0.05_25)] bg-[oklch(98%_0.01_25)] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[oklch(80%_0.08_25)] bg-white text-[oklch(52%_0.16_25)] shadow-[0_12px_28px_rgba(29,44,35,0.08)]">
            <XCircle className="h-6 w-6" />
          </div>

          <h3 className="arc-display mt-6 text-[2rem] font-black leading-tight text-[oklch(21%_0.035_145)]">
            Request a new reset link
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-[oklch(40%_0.04_145)]">{issueCopy.message}</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/forgot-password"
              className={cn(authPrimaryButtonClassName, "inline-flex items-center justify-center sm:flex-1")}
            >
              Request new link
            </Link>
            <Link
              to="/auth"
              className={cn(authSecondaryButtonClassName, "inline-flex items-center justify-center sm:flex-1")}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      ) : tokenVerification === undefined ? (
        <div className="rounded-[18px] border border-[oklch(85%_0.032_116)] bg-[oklch(99%_0.008_116)] p-8 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[oklch(78%_0.032_116)] bg-white text-[oklch(35%_0.085_153)] shadow-[0_12px_28px_rgba(29,44,35,0.10)]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          </div>
          <h3 className="arc-display mt-6 text-[1.8rem] font-black leading-tight text-[oklch(21%_0.035_145)]">
            Verifying the link
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-[oklch(40%_0.04_145)]">
            This takes just a moment. Once the link is confirmed, you can choose a new password and finish signing back in.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-5 text-base leading-8 text-[oklch(40%_0.04_145)]">
            Your new password needs at least 8 characters. Once it is saved, the current reset link is closed automatically.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-base font-bold text-[oklch(37%_0.04_145)]">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a new password"
                className={authInputClassName}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-base font-bold text-[oklch(37%_0.04_145)]">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter the new password"
                className={authInputClassName}
                required
              />
            </div>

            {passwordsDoNotMatch ? (
              <p className="text-sm font-semibold text-[oklch(52%_0.16_25)]">Passwords do not match yet.</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || passwordsDoNotMatch}
              className={cn(authPrimaryButtonClassName, "flex items-center justify-center gap-2")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Resetting password...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Reset password
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 border-t border-[oklch(85%_0.032_116)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-[oklch(43%_0.045_145)]">
              Need another recovery email instead? Start over from the forgot password page.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/forgot-password" className={authGhostLinkClassName}>
                Request a new link
              </Link>
              <Link to="/auth" className={authGhostLinkClassName}>
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>
        </>
      )}
    </AuthSplitShell>
  );
}
