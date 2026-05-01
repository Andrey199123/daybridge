import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS = {
  first_mission: {
    title: "First Care Plan",
    description: "Completed your first care plan",
    icon: "award",
  },
  streak_7: {
    title: "7-Day Streak",
    description: "Maintained a 7-day streak",
    icon: "star",
  },
  tasks_100: {
    title: "Century Club",
    description: "Completed 100 tasks",
    icon: "zap",
  },
  goals_5: {
    title: "Steady Support",
    description: "Completed 5 care plans",
    icon: "target",
  },
  goals_10: {
    title: "Care Anchor",
    description: "Completed 10 care plans",
    icon: "trophy",
  },
  streak_30: {
    title: "Monthly Warrior",
    description: "Maintained a 30-day streak",
    icon: "flame",
  },
} as const;

export type AchievementType = keyof typeof ACHIEVEMENT_DEFINITIONS;

// Get all achievements for the current user
export const getUserAchievements = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Check if user has a specific achievement
export const hasAchievement = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type))
      .first();

    return !!existing;
  },
});

// Award an achievement (internal - called from other mutations)
export const awardAchievement = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already has this achievement
    const existing = await ctx.db
      .query("achievements")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", args.type))
      .first();

    if (existing) return null; // Already has it

    const definition = ACHIEVEMENT_DEFINITIONS[args.type as AchievementType];
    if (!definition) return null; // Unknown achievement type

    return await ctx.db.insert("achievements", {
      userId: args.userId,
      type: args.type,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      unlockedAt: Date.now(),
    });
  },
});

// Check and award achievements based on user stats
export const checkAndAwardAchievements = internalMutation({
  args: {
    userId: v.id("users"),
    totalGoalsCompleted: v.number(),
    currentStreak: v.number(),
  },
  handler: async (ctx, args) => {
    const awarded: string[] = [];

    // First Care Plan - completed 1 care plan
    if (args.totalGoalsCompleted >= 1) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "first_mission"))
        .first();
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "first_mission",
          title: ACHIEVEMENT_DEFINITIONS.first_mission.title,
          description: ACHIEVEMENT_DEFINITIONS.first_mission.description,
          icon: ACHIEVEMENT_DEFINITIONS.first_mission.icon,
          unlockedAt: Date.now(),
        });
        awarded.push("first_mission");
      }
    }

    // Goal Getter - completed 5 goals
    if (args.totalGoalsCompleted >= 5) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "goals_5"))
        .first();
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "goals_5",
          title: ACHIEVEMENT_DEFINITIONS.goals_5.title,
          description: ACHIEVEMENT_DEFINITIONS.goals_5.description,
          icon: ACHIEVEMENT_DEFINITIONS.goals_5.icon,
          unlockedAt: Date.now(),
        });
        awarded.push("goals_5");
      }
    }

    // Care Anchor - completed 10 care plans
    if (args.totalGoalsCompleted >= 10) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "goals_10"))
        .first();
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "goals_10",
          title: ACHIEVEMENT_DEFINITIONS.goals_10.title,
          description: ACHIEVEMENT_DEFINITIONS.goals_10.description,
          icon: ACHIEVEMENT_DEFINITIONS.goals_10.icon,
          unlockedAt: Date.now(),
        });
        awarded.push("goals_10");
      }
    }

    // 7-Day Streak
    if (args.currentStreak >= 7) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "streak_7"))
        .first();
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "streak_7",
          title: ACHIEVEMENT_DEFINITIONS.streak_7.title,
          description: ACHIEVEMENT_DEFINITIONS.streak_7.description,
          icon: ACHIEVEMENT_DEFINITIONS.streak_7.icon,
          unlockedAt: Date.now(),
        });
        awarded.push("streak_7");
      }
    }

    // 30-Day Streak
    if (args.currentStreak >= 30) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("type", "streak_30"))
        .first();
      if (!existing) {
        await ctx.db.insert("achievements", {
          userId: args.userId,
          type: "streak_30",
          title: ACHIEVEMENT_DEFINITIONS.streak_30.title,
          description: ACHIEVEMENT_DEFINITIONS.streak_30.description,
          icon: ACHIEVEMENT_DEFINITIONS.streak_30.icon,
          unlockedAt: Date.now(),
        });
        awarded.push("streak_30");
      }
    }

    return awarded;
  },
});
