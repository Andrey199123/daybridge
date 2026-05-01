import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Phone, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DailyUsageDashboardProps {
  isUnlocked: boolean;
}

export function DailyUsageDashboard({ isUnlocked }: DailyUsageDashboardProps) {
  const dailyUsage = useQuery(api.audioCalls.getLatestDailyUsage);
  const fetchUsage = useAction(api.audioCalls.fetchDailyUsage);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchUsage();
      toast.success("Usage data refreshed");
    } catch (error) {
      toast.error("Failed to refresh usage data");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isUnlocked) {
    return null;
  }

  if (!dailyUsage) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-[var(--star)] flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Daily.co Usage
          </h4>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-[var(--star)]/60 text-sm">Click refresh to check your Daily.co usage</p>
      </div>
    );
  }

  const lastCheckedDate = new Date(dailyUsage.lastChecked).toLocaleString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-[var(--star)] flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Daily.co Usage
        </h4>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh usage data"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        {dailyUsage.isOverLimit ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Over Limit</span>
          </div>
        ) : dailyUsage.isNearLimit ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">Near Limit</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Within Limit</span>
          </div>
        )}
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--star)]/70 text-sm">Participant-Minutes</span>
          <span className="text-[var(--star)] font-semibold">
            {dailyUsage.participantMinutes.toLocaleString()} / {dailyUsage.freeLimit.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              dailyUsage.isOverLimit
                ? 'bg-red-500'
                : dailyUsage.isNearLimit
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(dailyUsage.percentUsed, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[var(--star)]/50 text-xs">0%</span>
          <span className="text-[var(--star)]/70 text-sm font-medium">
            {dailyUsage.percentUsed.toFixed(1)}% used
          </span>
          <span className="text-[var(--star)]/50 text-xs">100%</span>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[var(--star)]/60">Period:</span>
          <span className="text-[var(--star)]/80">{dailyUsage.from} to {dailyUsage.to}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--star)]/60">Last checked:</span>
          <span className="text-[var(--star)]/80">{lastCheckedDate}</span>
        </div>
      </div>

      {/* Warning Message */}
      {dailyUsage.isNearLimit && !dailyUsage.isOverLimit && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            You're approaching your free tier limit. Consider reducing call usage to avoid charges.
          </p>
        </div>
      )}

      {dailyUsage.isOverLimit && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">
            You've exceeded your free tier limit. Calls are disabled until next month or you can upgrade your Daily.co plan.
          </p>
        </div>
      )}
    </div>
  );
}
