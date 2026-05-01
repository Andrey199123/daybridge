import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Get all Mini-Arc templates
export const listTemplates = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("miniArcTemplates").collect();
  },
});

// Get recommended Mini-Arcs for user based on profile
export const getRecommended = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const allTemplates = await ctx.db.query("miniArcTemplates").collect();
    const userSkills = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();

    const acquiredSkills = new Set(userSkills.map((s) => s.skill.toLowerCase()));
    const userInterests = profile?.interests?.map((i) => i.toLowerCase()) || [];
    const userGrade = profile?.grade?.toString() || "";

    // Score each template
    const scored = allTemplates.map((template) => {
      let score = 0;

      // Skill gap bonus: prioritize skills user doesn't have
      const newSkills = template.skills.filter(
        (s) => !acquiredSkills.has(s.toLowerCase())
      );
      score += newSkills.length * 10;

      // Interest match bonus
      const interestMatch = template.interestAreas.some((area) =>
        userInterests.some(
          (interest) =>
            interest.includes(area.toLowerCase()) ||
            area.toLowerCase().includes(interest)
        )
      );
      if (interestMatch) score += 20;

      // Grade match bonus
      if (
        template.targetGrades &&
        template.targetGrades.some((g) => userGrade.includes(g))
      ) {
        score += 15;
      }

      return { template, score, newSkillsCount: newSkills.length };
    });

    // Sort by score and return top recommendations
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((s) => ({
        ...s.template,
        newSkillsCount: s.newSkillsCount,
        recommendationScore: s.score,
      }));
  },
});

// Get a single Mini-Arc template by ID
export const getTemplate = query({
  args: { templateId: v.id("miniArcTemplates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.templateId);
  },
});

// Get user's active Mini-Arcs
export const getUserMiniArcs = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let miniArcsQuery = ctx.db
      .query("userMiniArcs")
      .withIndex("by_user", (q) => q.eq("userId", userId as any));

    const miniArcs = await miniArcsQuery.collect();
    const filtered = args.status
      ? miniArcs.filter((m) => m.status === args.status)
      : miniArcs;

    // Enrich with template data
    const enriched = await Promise.all(
      filtered.map(async (miniArc) => {
        const template = await ctx.db.get(miniArc.templateId);
        return { ...miniArc, template };
      })
    );

    return enriched;
  },
});

// Start a Mini-Arc
export const startMiniArc = mutation({
  args: { templateId: v.id("miniArcTemplates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already active
    const existing = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .filter((q) =>
        q.and(
          q.eq(q.field("templateId"), args.templateId),
          q.eq(q.field("status"), "active")
        )
      )
      .first();

    if (existing) throw new Error("Mini-Arc already active");

    return await ctx.db.insert("userMiniArcs", {
      userId: userId as any,
      templateId: args.templateId,
      status: "active",
      startedAt: Date.now(),
      currentWeek: 1,
      completedTasks: [],
    });
  },
});

// Complete a task in a Mini-Arc
export const completeTask = mutation({
  args: {
    userMiniArcId: v.id("userMiniArcs"),
    taskIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const miniArc = await ctx.db.get(args.userMiniArcId);
    if (!miniArc || miniArc.userId !== (userId as any)) {
      throw new Error("Mini-Arc not found");
    }

    const template = await ctx.db.get(miniArc.templateId);
    if (!template) throw new Error("Template not found");

    const completedTasks = [...miniArc.completedTasks];
    const isNewCompletion = !completedTasks.includes(args.taskIndex);
    
    if (isNewCompletion) {
      completedTasks.push(args.taskIndex);
    }

    // Check if all tasks completed
    const totalTasks = template.weeklyTasks.length;
    const isComplete = completedTasks.length >= totalTasks;

    await ctx.db.patch(args.userMiniArcId, {
      completedTasks,
      status: isComplete ? "completed" : "active",
      completedAt: isComplete ? Date.now() : undefined,
    });

    // Award XP and coins for task completion (only if new completion)
    let xpEarned = 0;
    let coinsEarned = 0;
    
    if (isNewCompletion) {
      // Get user profile to update
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      
      if (profile) {
        // Award 15 XP per Mini-Arc task
        xpEarned = 15;
        await ctx.db.patch(profile._id, {
          points: (profile.points || 0) + xpEarned,
        });
        
        // Award 5 coins per Mini-Arc task
        coinsEarned = 5;
        await ctx.db.patch(profile._id, {
          coins: (profile.coins || 0) + coinsEarned,
        });
      }
    }

    // If completed, log skills to user profile and award bonus
    if (isComplete) {
      for (const skill of template.skills) {
        await ctx.db.insert("skillsLog", {
          userId: userId as any,
          skill,
          source: "mini-arc",
          sourceId: miniArc._id,
          sourceTitle: template.title,
          category: template.tags[0] || "General",
          earnedAt: Date.now(),
        });
      }
      
      // Bonus XP and coins for completing entire Mini-Arc
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      
      if (profile) {
        // Bonus 100 XP for completing Mini-Arc
        xpEarned += 100;
        await ctx.db.patch(profile._id, {
          points: (profile.points || 0) + 100,
        });
        
        // Bonus 50 coins for completing Mini-Arc
        coinsEarned += 50;
        await ctx.db.patch(profile._id, {
          coins: (profile.coins || 0) + 50,
        });
      }
    }

    return { isComplete, completedTasks, xpEarned, coinsEarned };
  },
});

// Skip goal suggestions after Mini-Arc completion
export const skipGoalSuggestions = mutation({
  args: { userMiniArcId: v.id("userMiniArcs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.userMiniArcId, {
      skippedGoalSuggestions: true,
    });
  },
});

// Convert suggested goal to real goal
export const convertToGoal = mutation({
  args: {
    userMiniArcId: v.id("userMiniArcs"),
    goalIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const miniArc = await ctx.db.get(args.userMiniArcId);
    if (!miniArc) throw new Error("Mini-Arc not found");

    const template = await ctx.db.get(miniArc.templateId);
    if (!template) throw new Error("Template not found");

    const suggestedGoal = template.suggestedGoals[args.goalIndex];
    if (!suggestedGoal) throw new Error("Goal suggestion not found");

    // Create the goal
    const goalId = await ctx.db.insert("goals", {
      userId: userId as any,
      title: suggestedGoal.title,
      description: suggestedGoal.description,
      category: suggestedGoal.category,
      status: "active",
      priority: "medium",
      aiGenerated: true,
    });

    // Mark suggestions as used
    await ctx.db.patch(args.userMiniArcId, {
      skippedGoalSuggestions: true,
    });

    return goalId;
  },
});

// Abandon a Mini-Arc
export const abandonMiniArc = mutation({
  args: { userMiniArcId: v.id("userMiniArcs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.userMiniArcId, {
      status: "abandoned",
    });
  },
});

// Initialize Mini-Arc templates (call once to seed data)
// Note: This function is deprecated. Templates should be added manually via the dashboard.
export const initializeTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("miniArcTemplates").first();
    if (existing) {
      return { initialized: false, message: "Templates already exist" };
    }

    // Templates should be added manually via dashboard
    return { initialized: false, message: "Please add templates manually via dashboard" };
  },
});

// Search Mini-Arcs by title or tags
export const searchMiniArcs = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const allTemplates = await ctx.db.query("miniArcTemplates").collect();
    const q = args.query.toLowerCase();

    return allTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        t.skills.some((skill) => skill.toLowerCase().includes(q))
    );
  },
});

// Filter Mini-Arcs by tag
export const filterByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const allTemplates = await ctx.db.query("miniArcTemplates").collect();
    return allTemplates.filter((t) =>
      t.tags.some((tag) => tag.toLowerCase() === args.tag.toLowerCase())
    );
  },
});
