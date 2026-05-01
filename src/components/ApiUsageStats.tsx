import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ApiUsageStatsProps {
  isUnlocked: boolean;
}

export function ApiUsageStats({ isUnlocked }: ApiUsageStatsProps) {
  const stats = useQuery(api.apiUsage.getUsageStats);
  const breakdown = useQuery(api.apiUsage.getUsageBreakdown);

  if (!isUnlocked) {
    return null;
  }

  if (!stats) {
    return (
      <div>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h4 className="text-md font-semibold text-[var(--star)] mb-2">Cohere API Usage</h4>
        <p className="text-[var(--star)]/60 text-sm">
          Track your AI API usage. Free tier limit: 1,000 calls/month
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-space-700)] rounded-lg p-3">
          <div className="text-[var(--star)]/60 text-sm mb-2">This Month</div>
          <div className="text-3xl font-bold text-[var(--star)]">{stats.monthCalls}</div>
          <div className="text-[var(--star)]/40 text-xs mt-1">of 1,000 calls</div>
        </div>

        <div className="bg-[var(--bg-space-700)] rounded-lg p-3">
          <div className="text-[var(--star)]/60 text-sm mb-2">Remaining</div>
          <div className="text-3xl font-bold text-blue-400">{stats.remaining}</div>
          <div className="text-[var(--star)]/40 text-xs mt-1">{stats.percentUsed}% used</div>
        </div>

        <div className="bg-[var(--bg-space-700)] rounded-lg p-3">
          <div className="text-[var(--star)]/60 text-sm mb-2">Today</div>
          <div className="text-3xl font-bold text-[var(--star)]">{stats.todayCalls}</div>
          <div className="text-[var(--star)]/40 text-xs mt-1">calls made</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-[var(--bg-space-700)] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--star)]/60 text-sm">Monthly Usage</span>
          <span className="text-[var(--star)] font-semibold">{stats.percentUsed}%</span>
        </div>
        <div className="w-full h-3 bg-[var(--bg-space-600)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              stats.percentUsed > 90
                ? 'bg-red-500'
                : stats.percentUsed > 70
                ? 'bg-yellow-500'
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            }`}
            style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
          />
        </div>
        {stats.percentUsed > 80 && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ You're approaching your monthly limit. Consider upgrading to a production key.
            </p>
          </div>
        )}
      </div>

      {/* Last 7 Days */}
      <div className="bg-[var(--bg-space-700)] rounded-lg p-3">
        <h4 className="text-md font-semibold text-[var(--star)] mb-3">Last 7 Days</h4>
        <div className="space-y-2">
          {stats.last7Days.map((day) => (
            <div key={day.date} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-[var(--star)]/60 text-sm">{day.date}</span>
              <span className="text-[var(--star)] font-medium">{day.calls} calls</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown by Endpoint */}
      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="bg-[var(--bg-space-700)] rounded-lg p-3">
          <h4 className="text-md font-semibold text-[var(--star)] mb-3">Usage by Feature</h4>
          <div className="space-y-2">
            {Object.entries(breakdown).map(([endpoint, calls]) => (
              <div key={endpoint} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-[var(--star)]/60 text-sm capitalize">
                  {endpoint.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-[var(--star)] font-medium">{calls} calls</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
