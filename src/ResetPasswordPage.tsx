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
    description: "Use the newest reset email from Arc so you are working with the only active recovery link.",
  },
  {
    index: "02",
    title: "Set a fresh password",
    description: "Choose a password with at least 8 characters so your account is protected before you sign back in.",
  },
  {
    index: "03",
    title: "Return to your dashboard",
    description: "Sign in with the new password and pick up your current goals, tasks, and progress where you left off.",
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
    description: "The page opened without a password reset token, so there is no secure request for Arc to verify.",
    message: "Request a fresh password reset email and open the newest link from your inbox.",
  },
  invalid: {
    eyebrow: "Invalid link",
    title: "This reset link is not valid",
    description: "The recovery link does not match an active Arc password reset request anymore.",
    message: "Ask for a new reset email and use the latest link that Arc sends you.",
  },
  expired: {
    eyebrow: "Link expired",
    title: "This reset link has expired",
    description: "Password reset links stay active for 1 hour, then Arc closes them automatically for security.",
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
      leftTitle={resetSuccess ? "Your Arc account is ready again." : "Choose a new password and get back to work."}
      leftDescription={
        resetSuccess
          ? "Your password has been updated. Sign back in and pick up your goals, milestones, and weekly execution plan without losing your place."
          : "This step closes the password recovery flow. Once the new password is saved, you can head straight back into Arc and continue your current mission."
      }
      leftPanel={
        <>
          <p className="text-sm font-medium text-blue-100/70">How the reset flow finishes</p>
          <ProcessTimeline items={resetTimelineRows} compact className="mt-3" />
          <p className="mt-6 text-sm leading-7 text-slate-400">
            For security, Arc only keeps the newest recovery link active. If a link expires or is reused, request a fresh one and continue from there.
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
          ? "You can sign in with the new password right away. Arc will also send you back to the sign-in screen in a few seconds."
          : issueCopy
            ? issueCopy.description
            : tokenVerification === undefined
              ? "We are confirming that this recovery link is still active before we show the password form."
              : "Create a new password with at least 8 characters, then sign back in to continue the work already waiting in Arc."
      }
    >
      {resetSuccess ? (
        <div className="rounded-[18px] border border-[#1f3554] bg-[#081423] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#35547c] bg-[#0d1c31] text-blue-200">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <h3 className="arc-display mt-6 text-[2rem] font-semibold leading-tight text-white">
            Password updated
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-slate-300">
            Your password has been reset successfully. You can use it immediately to sign back in to Arc.
          </p>

          <div className="mt-6 rounded-[16px] border border-[#1f3554] bg-[#0b1728] p-4 text-sm leading-7 text-slate-400">
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
        <div className="rounded-[18px] border border-[#4c2630] bg-[#1a1117] p-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#7c3d4a] bg-[#261821] text-red-300">
            <XCircle className="h-6 w-6" />
          </div>

          <h3 className="arc-display mt-6 text-[2rem] font-semibold leading-tight text-white">
            Request a new reset link
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-slate-300">{issueCopy.message}</p>

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
        <div className="rounded-[18px] border border-[#1f3554] bg-[#081423] p-8 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#35547c] bg-[#0d1c31] text-blue-200">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          </div>
          <h3 className="arc-display mt-6 text-[1.8rem] font-semibold leading-tight text-white">
            Verifying the link
          </h3>
          <p className="mt-4 text-[1rem] leading-7 text-slate-300">
            This takes just a moment. Once the link is confirmed, you can choose a new password and finish signing back in.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-5 text-sm leading-7 text-slate-400">
            Your new password needs at least 8 characters. Once it is saved, the current reset link is closed automatically.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-400">
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
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-400">
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
              <p className="text-sm text-red-300">Passwords do not match yet.</p>
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

          <div className="mt-6 flex flex-col gap-4 border-t border-[#1f3554] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-7 text-slate-500">
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
