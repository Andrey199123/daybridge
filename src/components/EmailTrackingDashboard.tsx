import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Mail, Eye, Clock, User, Lock, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ADMIN_PASSWORD = "1A4EQJNQ0tEckHAfc4caM_5UVZAAXp1DaEmR4W9UFWercfOa2AeEatzT40dja5vX1PB4FA4SIxwLBDBPG";

export function EmailTrackingDashboard() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const summary = useQuery(api.emailTracking.getTrackingSummary);
  const allEvents = useQuery(api.emailTracking.getAllTrackingEvents);
  const clearTracking = useMutation(api.emailTracking.clearAllTracking);

  const handleClearTracking = async () => {
    if (confirm("Are you sure you want to clear all tracking data? This cannot be undone.")) {
      try {
        const result = await clearTracking();
        toast.success(`Cleared ${result.deleted} tracking events`);
      } catch (error) {
        toast.error("Failed to clear tracking data");
      }
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true);
      setError("");
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[var(--bg-space)] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-[var(--bg-space-800)] rounded-xl p-8 border border-white/10">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-blue-400" />
            </div>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-[var(--star)] mb-2">
                Email Tracking Dashboard
              </h1>
              <p className="text-[var(--star)]/60 text-sm">
                Enter password to view tracking data
              </p>
            </div>
            
            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 pr-12 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg text-[var(--star)] placeholder:text-[var(--star)]/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--star)]/40 hover:text-[var(--star)]/60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {error && (
                <div className="text-red-400 text-sm text-center">
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
              >
                Unlock Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!summary || !allEvents) {
    return (
      <div className="min-h-screen bg-[var(--bg-space)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-space)] p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--star)] mb-2">
              Email Tracking Dashboard
            </h1>
            <p className="text-[var(--star)]/60">
              Educational demo: Track email opens for cybersecurity learning
            </p>
          </div>
          <button
            onClick={handleClearTracking}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-space-800)] rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[var(--star)]/60 text-sm">Total Opens</p>
                <p className="text-2xl font-bold text-[var(--star)]">
                  {summary.totalOpens}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-space-800)] rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-[var(--star)]/60 text-sm">Unique Recipients</p>
                <p className="text-2xl font-bold text-[var(--star)]">
                  {summary.uniqueRecipients}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-space-800)] rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-[var(--star)]/60 text-sm">Avg Opens/Recipient</p>
                <p className="text-2xl font-bold text-[var(--star)]">
                  {summary.uniqueRecipients > 0
                    ? (summary.totalOpens / summary.uniqueRecipients).toFixed(1)
                    : "0"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Opens by Recipient */}
        <div className="bg-[var(--bg-space-800)] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-[var(--star)] mb-4">
            Opens by Recipient
          </h2>
          <div className="space-y-3">
            {Object.entries(summary.byRecipient)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([email, count]) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 bg-[var(--bg-space-700)] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-[var(--star)] font-medium">{email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[var(--star)]/40" />
                    <span className="text-[var(--star)] font-semibold">
                      {count} {count === 1 ? "open" : "opens"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-[var(--bg-space-800)] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-[var(--star)] mb-4">
            Recent Opens
          </h2>
          <div className="space-y-3">
            {allEvents.slice(0, 20).map((event) => (
              <div
                key={event._id}
                className="p-4 bg-[var(--bg-space-700)] rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span className="text-[var(--star)] font-medium">
                      {event.recipientEmail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--star)]/60 text-sm">
                    <Clock className="w-4 h-4" />
                    {new Date(event.openedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-[var(--star)]/40 space-y-1 ml-6">
                  <div>Email ID: {event.emailId}</div>
                  {event.userAgent && (
                    <div className="truncate">User Agent: {event.userAgent}</div>
                  )}
                  {event.ipAddress && <div>IP: {event.ipAddress}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Educational Note */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 text-sm mb-2">
            <strong>Educational Purpose:</strong> This tracking system demonstrates
            how email tracking pixels work in cybersecurity.
          </p>
          <p className="text-yellow-400 text-sm">
            <strong>Note on Accuracy:</strong> Tracking pixels can show false positives from:
          </p>
          <ul className="text-yellow-400 text-sm mt-2 ml-4 list-disc space-y-1">
            <li>Email clients pre-fetching images (Apple Mail, Outlook)</li>
            <li>Spam filters scanning emails</li>
            <li>You opening your own test emails</li>
            <li>Email security scanners</li>
          </ul>
          <p className="text-yellow-400 text-sm mt-2">
            Real open rates are typically 60-70% of tracked opens. Use this data as a rough indicator, not exact metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
