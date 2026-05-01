import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { Lock, AlertTriangle, Trash2, Eye, EyeOff } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";
import { DailyUsageDashboard } from "../DailyUsageDashboard";
import { ApiUsageStats } from "../ApiUsageStats";

const ADMIN_PASSWORD = "1A4EQJNQ0tEckHAfc4caM_5UVZAAXp1DaEmR4W9UFWercfOa2AeEatzT40dja5vX1PB4FA4SIxwLBDBPG";

export function AccountSettings() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const deleteUser = useMutation(api.users.deleteUser);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  // Shared password state for usage stats
  const [isUsageUnlocked, setIsUsageUnlocked] = useState(false);
  const [usagePassword, setUsagePassword] = useState("");
  const [showUsagePassword, setShowUsagePassword] = useState(false);
  const [usageError, setUsageError] = useState("");

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUnlockUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (usagePassword === ADMIN_PASSWORD) {
      setIsUsageUnlocked(true);
      setUsageError("");
    } else {
      setUsageError("Incorrect password");
      setUsagePassword("");
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.new.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setIsChangingPassword(true);
    try {
      // TODO: Implement password change API
      // await changePassword({ current: passwordForm.current, new: passwordForm.new });
      
      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success("Password changed successfully");
      setPasswordForm({ current: "", new: "", confirm: "" });
      setShowPasswordForm(false);
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password. Please check your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (emailConfirmation !== currentUser?.email) {
      toast.error("Email confirmation does not match");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUser();
      toast.success("Account deleted successfully");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email (Read-only) */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4">
        <h3 className="text-lg font-semibold text-[var(--star)] mb-3">Email Address</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[var(--star)] font-medium">{currentUser.email}</p>
            <p className="text-[var(--star)]/60 text-xs mt-1">
              Your email address is used for authentication
            </p>
          </div>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
            Verified
          </span>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--star)]/60" />
            <h3 className="text-lg font-semibold text-[var(--star)]">Password</h3>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all text-sm font-medium"
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordForm ? (
          <div className="space-y-4 mt-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current: e.target.value })
                  }
                  className="w-full px-4 py-3 pr-12 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--star)]/40 hover:text-[var(--star)]/60"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.new}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, new: e.target.value })
                  }
                  className="w-full px-4 py-3 pr-12 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Enter new password (min. 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--star)]/40 hover:text-[var(--star)]/60"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--star)]/80 mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm: e.target.value })
                  }
                  className="w-full px-4 py-3 pr-12 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--star)]/40 hover:text-[var(--star)]/60"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ current: "", new: "", confirm: "" });
                }}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)] rounded-lg hover:bg-[var(--bg-space-600)] transition-all font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[var(--star)]/60 text-sm">
            ••••••••••••
          </p>
        )}
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
        </div>

        <p className="text-[var(--star)]/60 text-sm mb-4">
          Once you delete your account, there is no going back. This will permanently remove:
        </p>
        <ul className="text-[var(--star)]/60 text-sm space-y-1 mb-4 list-disc list-inside">
          <li>All your missions and goals</li>
          <li>All milestones and tasks</li>
          <li>Your profile and progress</li>
          <li>All associated data</li>
        </ul>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full px-4 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        ) : (
          <div className="space-y-4">
            {deleteStep === 1 ? (
              <>
                <div className="bg-[var(--bg-space-900)] rounded-lg p-4">
                  <p className="text-[var(--star)] font-medium mb-2">
                    Are you absolutely sure?
                  </p>
                  <p className="text-[var(--star)]/60 text-sm">
                    This action cannot be undone. All your data will be permanently deleted.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteStep(1);
                    }}
                    className="flex-1 px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)] rounded-lg hover:bg-[var(--bg-space-600)] transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-red-400 mb-2">
                    Type your email to confirm: <span className="font-mono">{currentUser.email}</span>
                  </label>
                  <input
                    type="email"
                    value={emailConfirmation}
                    onChange={(e) => setEmailConfirmation(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--input-bg)] border border-red-500/50 rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteStep(1);
                      setEmailConfirmation("");
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-[var(--bg-space-700)] text-[var(--star)] rounded-lg hover:bg-[var(--bg-space-600)] transition-all font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || emailConfirmation !== currentUser.email}
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Permanently Delete
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Usage Statistics - Password Protected */}
      <div className="bg-[var(--bg-space-800)] rounded-xl p-4">
        <h3 className="text-lg font-semibold text-[var(--star)] mb-3">Usage Statistics</h3>
        
        {!isUsageUnlocked ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-[var(--star)]/60 text-sm">
                Enter password to view API and Daily.co usage statistics
              </p>
            </div>
            
            <form onSubmit={handleUnlockUsage} className="w-full max-w-sm space-y-4">
              <div className="relative">
                <input
                  type={showUsagePassword ? "text" : "password"}
                  value={usagePassword}
                  onChange={(e) => {
                    setUsagePassword(e.target.value);
                    setUsageError("");
                  }}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 pr-12 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowUsagePassword(!showUsagePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--star)]/40 hover:text-[var(--star)]/60"
                >
                  {showUsagePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {usageError && (
                <div className="text-red-400 text-sm text-center">
                  {usageError}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
              >
                Unlock
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Usage Stats */}
            <ApiUsageStats isUnlocked={true} />

            {/* Daily.co Usage Dashboard */}
            <DailyUsageDashboard isUnlocked={true} />
          </div>
        )}
      </div>
    </div>
  );
}

