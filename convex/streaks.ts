import { action, query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc } from "./_generated/dataModel";

// Track daily login for streak
export const trackDailyLogin = mutation({
    args: {
        localDate: v.optional(v.string()), // User's local date in YYYY-MM-DD format
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        // Use the user's local date if provided, otherwise fall back to UTC
        const todayStr = args.localDate || new Date().toISOString().split("T")[0];
        
        // Check if already logged in today
        let streak = await ctx.db
            .query("streaks")
            .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", todayStr))
            .first();

        if (streak) {
            // Already logged in today - return current streak info
            const userProfile = await ctx.db
                .query("userProfiles")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .first();
            return { 
                alreadyLoggedIn: true, 
                currentStreak: userProfile?.currentStreak || 0,
                coins: 0,
                xp: 0
            };
        }

        console.log("Creating new streak entry for today");

        // Create today's streak entry
        await ctx.db.insert("streaks", {
            userId,
            date: todayStr,
            tasksCompleted: 0,
            goalsWorkedOn: [],
        });

        // Update streak count and award rewards
        const userProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!userProfile) return null;

        // Check if yesterday had activity
        const yesterday = new Date(todayStr);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const yesterdaysStreak = await ctx.db
            .query("streaks")
            .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", yesterdayStr))
            .first();

        let currentStreak = 1; // Start with 1 for today's login
        if (yesterdaysStreak) {
            // Streak continued from yesterday
            currentStreak = (userProfile.currentStreak || 0) + 1;
            console.log(`Streak continued from yesterday: ${currentStreak}`);
        } else if (userProfile.currentStreak > 0) {
            // Streak was broken - check for insurance
            console.log("Streak was broken, checking for insurance");
            const insuranceUsed = await ctx.runMutation(internal.shop.useStreakInsurance, { userId });
            if (insuranceUsed) {
                currentStreak = (userProfile.currentStreak || 0) + 1;
                await ctx.runMutation(api.notifications.createNotification, {
                    message: "🛡️ Streak Insurance activated! Your streak was saved!",
                });
                console.log(`Insurance used, streak saved: ${currentStreak}`);
            } else {
                console.log("No insurance, streak reset to 1");
            }
            // If no insurance, streak resets to 1 (already set above)
        } else {
            console.log("New streak started: 1 day");
        }

        let longestStreak = userProfile.longestStreak || 0;
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
        }

        // Calculate rewards based on streak
        const weekBonus = Math.floor(currentStreak / 7);
        const coins = Math.min(10 + (weekBonus * 5), 50);
        const xp = Math.min(5 + (weekBonus * 3), 30);

        console.log(`Awarding ${coins} coins and ${xp} XP for ${currentStreak} day streak`);

        // Award coins and points (using points as XP)
        await ctx.db.patch(userProfile._id, {
            currentStreak,
            longestStreak,
            coins: (userProfile.coins || 0) + coins,
            points: (userProfile.points || 0) + xp,
        });

        // Show notification
        await ctx.runMutation(api.notifications.createNotification, {
            message: `🔥 ${currentStreak} day streak! Earned ${coins} coins and ${xp} XP!`,
        });

        // Check for streak-based achievements
        await ctx.runMutation(internal.achievements.checkAndAwardAchievements, {
            userId,
            totalGoalsCompleted: userProfile.totalGoalsCompleted || 0,
            currentStreak,
        });

        console.log(`Streak tracking complete: ${currentStreak} days`);
        return { alreadyLoggedIn: false, currentStreak, coins, xp };
    },
});

export const logTaskCompletion = mutation({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return;

        const todayStr = new Date().toISOString().split("T")[0];
        let streak = await ctx.db
            .query("streaks")
            .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", todayStr))
            .first();

        if (streak) {
            await ctx.db.patch(streak._id, {
                tasksCompleted: streak.tasksCompleted + 1,
                goalsWorkedOn: [...new Set([...streak.goalsWorkedOn, args.goalId])],
            });
        } else {
            await ctx.db.insert("streaks", {
                userId,
                date: todayStr,
                tasksCompleted: 1,
                goalsWorkedOn: [args.goalId],
            });
        }
    },
});

export const getStreakForDate = query({
    args: {
        date: v.string(),
    },
    handler: async (ctx, args): Promise<Doc<"streaks"> | null> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        return await ctx.db
            .query("streaks")
            .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
            .first();
    },
});

export const updateStreak = action({
  handler: async (ctx): Promise<void> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const userProfile = await ctx.runQuery(api.users.getCurrentUser);
    if (!userProfile?.profile) return;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const todaysStreak: Doc<"streaks"> | null = await ctx.runQuery(api.streaks.getStreakForDate, { date: todayStr });

    // Only update the streak count on the first task completion of the day
    if (todaysStreak && todaysStreak.tasksCompleted === 1) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const yesterdaysStreak: Doc<"streaks"> | null = await ctx.runQuery(api.streaks.getStreakForDate, { date: yesterdayStr });

        let currentStreak = 1; // Default to 1 for a new streak
        if (yesterdaysStreak && yesterdaysStreak.tasksCompleted > 0) {
            // Streak continued from yesterday
            currentStreak = (userProfile.profile.currentStreak || 0) + 1;
        } else if (userProfile.profile.currentStreak > 0) {
            // Streak was broken - check for insurance
            const insuranceUsed = await ctx.runMutation(internal.shop.useStreakInsurance, { userId });
            if (insuranceUsed) {
                // Insurance saved the streak!
                currentStreak = (userProfile.profile.currentStreak || 0) + 1;
                await ctx.runMutation(api.notifications.createNotification, {
                    message: "🛡️ Streak Insurance activated! Your streak was saved!",
                });
            }
            // If no insurance, streak resets to 1 (already set above)
        }

        let longestStreak = userProfile.profile.longestStreak || 0;
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
        }

        await ctx.runMutation(api.users.updateStreak, {
            currentStreak,
            longestStreak,
        });
        
        // Check for streak-based achievements
        await ctx.runMutation(internal.achievements.checkAndAwardAchievements, {
            userId,
            totalGoalsCompleted: userProfile.profile.totalGoalsCompleted || 0,
            currentStreak,
        });
    }
  },
});

// Get streak statistics and history
export const getStreakStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user profile for current/longest streak
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) return null;

    // Get last 30 days of streak data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const streakHistory = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter to last 30 days and sort by date
    const recentStreaks = streakHistory
      .filter((s) => s.date >= thirtyDaysAgoStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate streak start date (when current streak began)
    let streakStartDate: string | null = null;
    if (profile.currentStreak > 0) {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (profile.currentStreak - 1));
      streakStartDate = startDate.toISOString().split("T")[0];
    }

    // Calculate total tasks completed
    const totalTasksCompleted = streakHistory.reduce(
      (sum, s) => sum + s.tasksCompleted,
      0
    );

    // Calculate active days (days with at least 1 task)
    const activeDays = streakHistory.filter((s) => s.tasksCompleted > 0).length;

    // Build calendar data for last 30 days
    // For login-based streaks, any streak entry means the user logged in that day
    const calendarData: { date: string; tasksCompleted: number; hasActivity: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const streakData = recentStreaks.find((s) => s.date === dateStr);
      calendarData.push({
        date: dateStr,
        tasksCompleted: streakData?.tasksCompleted || 0,
        hasActivity: !!streakData, // Has activity if streak entry exists (user logged in)
      });
    }

    return {
      currentStreak: profile.currentStreak || 0,
      longestStreak: profile.longestStreak || 0,
      streakStartDate,
      totalTasksCompleted,
      activeDays,
      calendarData,
      recentStreaks,
    };
  },
});
