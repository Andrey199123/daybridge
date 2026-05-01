import React, { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Zap, Medal } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function LeaderboardPage() {
  const [activeLeaderboard, setActiveLeaderboard] = useState<"xp" | "streak">("xp");
  
  // Fetch leaderboards
  const xpLeaderboard = useQuery(api.users.getXPLeaderboard);
  const streakLeaderboard = useQuery(api.users.getStreakLeaderboard);
  const currentUser = useQuery(api.users.getCurrentUser);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Care Signals</h1>
          </div>
          <p className="text-white/60">
            See consistency and support activity across care plans.
          </p>
        </div>

        {/* Toggle between care points and streak */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveLeaderboard("xp")}
            className={`flex-1 py-4 px-6 rounded-2xl text-base font-semibold transition-all ${
              activeLeaderboard === "xp"
                ? "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-cyan)] text-white shadow-lg shadow-cyan-500/20"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <Zap className="w-5 h-5 inline mr-2" />
            Care Points
          </button>
          <button
            onClick={() => setActiveLeaderboard("streak")}
            className={`flex-1 py-4 px-6 rounded-2xl text-base font-semibold transition-all ${
              activeLeaderboard === "streak"
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <Flame className="w-5 h-5 inline mr-2" />
            Streaks
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="space-y-3">
            {activeLeaderboard === "xp" ? (
              xpLeaderboard && xpLeaderboard.length > 0 ? (
                xpLeaderboard.map((entry) => {
                  const isCurrentUser = currentUser?.profile?.name === entry.name;
                  return (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entry.rank * 0.05 }}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        isCurrentUser
                          ? "bg-gradient-to-r from-[var(--accent-cyan)]/20 to-transparent border-2 border-[var(--accent-cyan)]/50"
                          : entry.rank <= 3
                          ? "bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        entry.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/50" :
                        entry.rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/50" :
                        entry.rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/50" :
                        "bg-white/10 text-white/80"
                      }`}>
                        {entry.rank <= 3 ? (
                          <Medal className="w-6 h-6" />
                        ) : (
                          entry.rank
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-white truncate flex items-center gap-2">
                          {entry.name}
                          {isCurrentUser && (
                            <span className="text-xs bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/50">
                          Rank #{entry.rank}
                        </div>
                      </div>

                      {/* Care points */}
                      <div className="flex items-center gap-2 bg-gradient-to-r from-[var(--accent-violet)]/20 to-[var(--accent-cyan)]/20 px-4 py-2 rounded-lg border border-[var(--accent-cyan)]/30">
                        <Zap className="w-5 h-5 text-[var(--accent-cyan)]" />
                        <span className="text-lg font-bold text-white">
                          {entry.points.toLocaleString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-white/40 py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No leaderboard data yet</p>
                </div>
              )
            ) : (
              streakLeaderboard && streakLeaderboard.length > 0 ? (
                streakLeaderboard.map((entry) => {
                  const isCurrentUser = currentUser?.profile?.name === entry.name;
                  return (
                    <motion.div
                      key={entry.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: entry.rank * 0.05 }}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                        isCurrentUser
                          ? "bg-gradient-to-r from-orange-500/20 to-transparent border-2 border-orange-500/50"
                          : entry.rank <= 3
                          ? "bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        entry.rank === 1 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-500/50" :
                        entry.rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/50" :
                        entry.rank === 3 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-black shadow-lg shadow-orange-500/50" :
                        "bg-white/10 text-white/80"
                      }`}>
                        {entry.rank <= 3 ? (
                          <Medal className="w-6 h-6" />
                        ) : (
                          entry.rank
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold text-white truncate flex items-center gap-2">
                          {entry.name}
                          {isCurrentUser && (
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/50">
                          Rank #{entry.rank}
                        </div>
                      </div>

                      {/* Streak Score */}
                      <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-4 py-2 rounded-lg border border-orange-500/30">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <span className="text-lg font-bold text-white">
                          {entry.currentStreak}
                        </span>
                        <span className="text-sm text-white/60">
                          {entry.currentStreak === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center text-white/40 py-12">
                  <Flame className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No leaderboard data yet</p>
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
