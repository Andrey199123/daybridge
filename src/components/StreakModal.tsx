import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X, Flame, Trophy, Coins, Zap } from "lucide-react";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StreakModal({ isOpen, onClose }: StreakModalProps) {
  const streakStats = useQuery(api.streaks.getStreakStats);

  // Debug logging
  React.useEffect(() => {
    if (isOpen && streakStats) {
      console.log("Streak stats loaded:", streakStats);
    }
  }, [isOpen, streakStats]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Calculate streak rewards
  const getStreakRewards = (streak: number) => {
    if (streak === 0) return { coins: 0, xp: 0 };
    
    let coins = 10;
    let xp = 5;
    
    const weekBonus = Math.floor(streak / 7);
    coins += weekBonus * 5;
    xp += weekBonus * 3;
    
    coins = Math.min(coins, 50);
    xp = Math.min(xp, 30);
    
    return { coins, xp };
  };

  const currentRewards = getStreakRewards(streakStats?.currentStreak || 0);
  const nextWeekRewards = getStreakRewards(((streakStats?.currentStreak || 0) + 7));

  // Generate last 30 days calendar (always show all 30 days)
  const generateLast30Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if this day has activity from the backend data
      const dayData = streakStats?.calendarData?.find(d => d.date === dateStr);
      
      days.push({
        date: dateStr,
        hasActivity: dayData?.hasActivity || false,
      });
    }
    
    return days;
  };

  const calendarDays = generateLast30Days();
  const today = new Date().toISOString().split('T')[0];

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a1a2e] rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="relative px-6 pt-4 pb-3 bg-gradient-to-b from-orange-500/10 to-transparent">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>

              <div className="flex flex-col items-center text-center">
                {/* Flame Icon */}
                <motion.div
                  className="w-12 h-12 mb-2 flex items-center justify-center"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="relative">
                    <Flame className="w-12 h-12 text-orange-500 fill-orange-500" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-orange-400/20 blur-xl rounded-full" />
                  </div>
                </motion.div>

                {/* Streak Number */}
                <h2 className="text-2xl font-bold text-white mb-1">
                  {streakStats?.currentStreak || 0} day streak
                </h2>
                
                {/* Subtitle */}
                <p className="text-white/60 text-xs">
                  {streakStats?.currentStreak === 0
                    ? "Log in daily to start your streak!"
                    : "Keep logging in every day!"}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 space-y-3">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" strokeWidth={2} />
                  <div className="text-lg font-bold text-white">
                    {streakStats?.longestStreak || 0}
                  </div>
                  <div className="text-[10px] text-white/50">Longest</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <Coins className="w-4 h-4 text-yellow-400 mx-auto mb-1" strokeWidth={2} />
                  <div className="text-lg font-bold text-white">
                    {currentRewards.coins}
                  </div>
                  <div className="text-[10px] text-white/50">Daily Coins</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <Zap className="w-4 h-4 text-cyan-400 mx-auto mb-1" strokeWidth={2} />
                  <div className="text-lg font-bold text-white">
                    {currentRewards.xp}
                  </div>
                  <div className="text-[10px] text-white/50">Daily XP</div>
                </div>
              </div>

              {/* Rewards Info Callout */}
              <div className="bg-cyan-500/10 rounded-lg p-2.5 border border-cyan-500/20">
                <p className="text-[11px] text-white/80 leading-relaxed">
                  <span className="font-semibold text-white">Earn more rewards!</span> Your daily coins and XP increase every 7 days.
                  {streakStats && streakStats.currentStreak > 0 && streakStats.currentStreak % 7 !== 0 && (
                    <span className="block mt-2 text-cyan-400 font-medium">
                      {7 - (streakStats.currentStreak % 7)} more days → +{nextWeekRewards.coins - currentRewards.coins} coins, +{nextWeekRewards.xp - currentRewards.xp} XP
                    </span>
                  )}
                </p>
              </div>

              {/* Calendar */}
              <div>
                <h3 className="text-xs font-semibold text-white mb-2">
                  Last 30 Days
                </h3>
                
                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
                    <div key={i} className="text-center text-[10px] font-medium text-white/40">
                      {label}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="space-y-1.5">
                  {(() => {
                    const weeks: any[][] = [];
                    let currentWeek: any[] = [];
                    
                    // Get day of week for first date (0 = Sunday, 6 = Saturday)
                    const firstDate = new Date(calendarDays[0].date + 'T00:00:00');
                    const firstDayOfWeek = firstDate.getDay();
                    
                    // Fill empty slots at start
                    for (let i = 0; i < firstDayOfWeek; i++) {
                      currentWeek.push(null);
                    }
                    
                    // Add all days
                    calendarDays.forEach((day) => {
                      currentWeek.push(day);
                      if (currentWeek.length === 7) {
                        weeks.push(currentWeek);
                        currentWeek = [];
                      }
                    });
                    
                    // Fill remaining slots
                    while (currentWeek.length > 0 && currentWeek.length < 7) {
                      currentWeek.push(null);
                    }
                    if (currentWeek.length > 0) {
                      weeks.push(currentWeek);
                    }
                    
                    return weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
                        {week.map((day, dayIndex) => {
                          if (!day) {
                            return <div key={`empty-${weekIndex}-${dayIndex}`} className="aspect-square" />;
                          }
                          
                          const isToday = day.date === today;
                          const dayOfMonth = new Date(day.date + 'T00:00:00').getDate();
                          
                          // Check if this day is part of the current streak
                          const isInCurrentStreak = streakStats?.currentStreak && streakStats.currentStreak > 0 && (() => {
                            const todayDate = new Date(today + 'T00:00:00');
                            const dayDate = new Date(day.date + 'T00:00:00');
                            const diffDays = Math.floor((todayDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
                            return diffDays >= 0 && diffDays < streakStats.currentStreak;
                          })();
                          
                          return (
                            <motion.div
                              key={day.date}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: (weekIndex * 7 + dayIndex) * 0.015 }}
                              className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all relative overflow-hidden ${
                                isToday && day.hasActivity
                                  ? "bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 text-white"
                                  : isInCurrentStreak && day.hasActivity
                                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30"
                                  : day.hasActivity
                                  ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                                  : isToday
                                  ? "bg-gradient-to-br from-orange-500/30 via-orange-600/30 to-red-500/30 text-orange-300 border-2 border-orange-500/60"
                                  : "bg-white/5 text-white/30 border border-white/10"
                              }`}
                              title={`${formatDate(day.date)}: ${day.hasActivity ? 'Active' : 'Inactive'}`}
                            >
                              {/* Burning glow effect for today - always show if it's today */}
                              {isToday && (
                                <>
                                  {/* Pulsing outer glow */}
                                  <motion.div
                                    className="absolute inset-0 rounded-lg bg-orange-400/30 blur-lg"
                                    animate={{
                                      scale: [1, 1.4, 1],
                                      opacity: [0.3, 0.6, 0.3],
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                  />
                                  {/* Inner pulsing glow */}
                                  <motion.div
                                    className="absolute inset-0 rounded-lg bg-orange-500/20 blur-md"
                                    animate={{
                                      scale: [1, 1.2, 1],
                                      opacity: [0.4, 0.7, 0.4],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                      delay: 0.3,
                                    }}
                                  />
                                  {/* Animated border glow */}
                                  <motion.div
                                    className="absolute inset-0 rounded-lg"
                                    animate={{
                                      boxShadow: [
                                        "0 0 15px rgba(251, 146, 60, 0.4), inset 0 0 10px rgba(251, 146, 60, 0.2)",
                                        "0 0 25px rgba(251, 146, 60, 0.7), inset 0 0 15px rgba(251, 146, 60, 0.4)",
                                        "0 0 15px rgba(251, 146, 60, 0.4), inset 0 0 10px rgba(251, 146, 60, 0.2)",
                                      ],
                                    }}
                                    transition={{
                                      duration: 1.8,
                                      repeat: Infinity,
                                      ease: "easeInOut",
                                    }}
                                  />
                                  {/* Flame particles */}
                                  {[...Array(3)].map((_, i) => (
                                    <motion.div
                                      key={i}
                                      className="absolute w-1 h-1 bg-orange-400 rounded-full"
                                      style={{
                                        left: `${30 + i * 20}%`,
                                        bottom: '20%',
                                      }}
                                      animate={{
                                        y: [-5, -15, -5],
                                        opacity: [0, 1, 0],
                                        scale: [0.5, 1, 0.5],
                                      }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        ease: "easeOut",
                                        delay: i * 0.3,
                                      }}
                                    />
                                  ))}
                                </>
                              )}
                              
                              {/* Streak connector - show line to previous day if both are in streak */}
                              {isInCurrentStreak && day.hasActivity && dayIndex > 0 && (() => {
                                const prevDay = week[dayIndex - 1];
                                if (prevDay && prevDay.hasActivity) {
                                  const prevDayDate = new Date(prevDay.date + 'T00:00:00');
                                  const currentDayDate = new Date(day.date + 'T00:00:00');
                                  const diffDays = Math.floor((currentDayDate.getTime() - prevDayDate.getTime()) / (1000 * 60 * 60 * 24));
                                  if (diffDays === 1) {
                                    return (
                                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-gradient-to-r from-orange-500 to-transparent -translate-x-full" />
                                    );
                                  }
                                }
                                return null;
                              })()}
                              
                              <span className="relative z-10 font-bold">
                                {day.hasActivity ? '✓' : dayOfMonth}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-green-500/20"
              >
                {streakStats?.currentStreak === 0 ? "Start your streak today!" : "Continue your streak!"}
              </button>

              {/* Bottom Message */}
              <p className="text-center text-[10px] text-white/60 pb-1">
                {streakStats?.currentStreak === 0 ? (
                  "Log in tomorrow to keep it going"
                ) : streakStats?.currentStreak === 1 ? (
                  "Great start! Come back tomorrow"
                ) : streakStats?.currentStreak && streakStats.currentStreak < 7 ? (
                  `${7 - streakStats.currentStreak} more days to reach a week!`
                ) : streakStats?.currentStreak && streakStats.currentStreak < 30 ? (
                  `${30 - streakStats.currentStreak} more days to reach a month!`
                ) : (
                  "You're unstoppable! Keep it going 🔥"
                )}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
