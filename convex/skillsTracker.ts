import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Log skills when a milestone is completed
export const logMilestoneSkills = internalMutation({
  args: {
    userId: v.id("users"),
    milestoneId: v.id("milestones"),
    milestoneTitle: v.string(),
    skills: v.array(v.string()),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    for (const skill of args.skills) {
      // Check if this skill from this source already exists
      const existing = await ctx.db
        .query("skillsLog")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("skill"), skill),
            q.eq(q.field("sourceId"), args.milestoneId)
          )
        )
        .first();
      
      if (!existing) {
        await ctx.db.insert("skillsLog", {
          userId: args.userId,
          skill,
          source: "milestone",
          sourceId: args.milestoneId,
          sourceTitle: args.milestoneTitle,
          category: args.category,
          earnedAt: now,
        });
      }
    }
    
    // Also update the user's aggregated skills array
    await updateUserSkillsArray(ctx, args.userId);
  },
});

// Log skills when a task is completed
export const logTaskSkills = internalMutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("tasks"),
    taskTitle: v.string(),
    skills: v.array(v.string()),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    for (const skill of args.skills) {
      const existing = await ctx.db
        .query("skillsLog")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => 
          q.and(
            q.eq(q.field("skill"), skill),
            q.eq(q.field("sourceId"), args.taskId)
          )
        )
        .first();
      
      if (!existing) {
        await ctx.db.insert("skillsLog", {
          userId: args.userId,
          skill,
          source: "task",
          sourceId: args.taskId,
          sourceTitle: args.taskTitle,
          category: args.category,
          earnedAt: now,
        });
      }
    }
    
    await updateUserSkillsArray(ctx, args.userId);
  },
});

// Log experience when a goal is completed
export const logGoalExperience = internalMutation({
  args: {
    userId: v.id("users"),
    goalId: v.id("goals"),
    goalTitle: v.string(),
    goalDescription: v.string(),
    category: v.string(),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Determine experience type based on category and title
    const titleLower = args.goalTitle.toLowerCase();
    const descLower = args.goalDescription.toLowerCase();
    
    let experienceType = "project"; // default
    if (titleLower.includes("internship") || descLower.includes("internship")) {
      experienceType = "internship_search";
    } else if (titleLower.includes("competition") || titleLower.includes("contest") || 
               titleLower.includes("olympiad") || titleLower.includes("amc") || titleLower.includes("sat")) {
      experienceType = "competition";
    } else if (titleLower.includes("learn") || titleLower.includes("course") || 
               titleLower.includes("study") || titleLower.includes("master")) {
      experienceType = "learning";
    } else if (titleLower.includes("build") || titleLower.includes("create") || 
               titleLower.includes("develop") || titleLower.includes("launch")) {
      experienceType = "project";
    } else if (titleLower.includes("network") || titleLower.includes("connect") || 
               titleLower.includes("outreach")) {
      experienceType = "networking";
    } else if (titleLower.includes("apply") || titleLower.includes("application") || 
               titleLower.includes("college")) {
      experienceType = "application";
    }
    
    // Check if experience already logged for this goal
    const existing = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("goalId"), args.goalId))
      .first();
    
    if (!existing) {
      await ctx.db.insert("experiencesLog", {
        userId: args.userId,
        type: experienceType,
        title: args.goalTitle,
        description: args.goalDescription,
        category: args.category,
        skills: args.skills,
        goalId: args.goalId,
        completedAt: Date.now(),
      });
    }
  },
});

// Helper to update user's aggregated skills array
async function updateUserSkillsArray(ctx: any, userId: Id<"users">) {
  // Get all unique skills for this user
  const skillsLog = await ctx.db
    .query("skillsLog")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
  
  const uniqueSkills = [...new Set(skillsLog.map((s: any) => s.skill))];
  
  // Update user profile
  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  
  if (userProfile) {
    await ctx.db.patch(userProfile._id, { skills: uniqueSkills });
  }
}

// Get all skills for the current user with counts and sources
export const getUserSkills = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { skills: [], totalCount: 0 };
    
    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Aggregate skills with counts and sources
    const skillsMap = new Map<string, { 
      skill: string; 
      count: number; 
      sources: Array<{ type: string; title: string; earnedAt: number }>;
      categories: string[];
    }>();
    
    for (const entry of skillsLog) {
      const existing = skillsMap.get(entry.skill);
      if (existing) {
        existing.count++;
        existing.sources.push({
          type: entry.source,
          title: entry.sourceTitle,
          earnedAt: entry.earnedAt,
        });
        if (!existing.categories.includes(entry.category)) {
          existing.categories.push(entry.category);
        }
      } else {
        skillsMap.set(entry.skill, {
          skill: entry.skill,
          count: 1,
          sources: [{
            type: entry.source,
            title: entry.sourceTitle,
            earnedAt: entry.earnedAt,
          }],
          categories: [entry.category],
        });
      }
    }
    
    // Sort by count (most used skills first)
    const skills = Array.from(skillsMap.values()).sort((a, b) => b.count - a.count);
    
    return {
      skills,
      totalCount: skillsLog.length,
    };
  },
});

// Get all experiences for the current user
export const getUserExperiences = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const experiences = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Sort by completion date (most recent first)
    return experiences.sort((a, b) => b.completedAt - a.completedAt);
  },
});

// Get skills summary for resume generation
export const getSkillsSummary = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { byCategory: {}, topSkills: [], totalExperiences: 0 };
    
    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    const experiences = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    // Group skills by category
    const byCategory: Record<string, string[]> = {};
    const skillCounts = new Map<string, number>();
    
    for (const entry of skillsLog) {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      if (!byCategory[entry.category].includes(entry.skill)) {
        byCategory[entry.category].push(entry.skill);
      }
      skillCounts.set(entry.skill, (skillCounts.get(entry.skill) || 0) + 1);
    }
    
    // Get top 10 skills by frequency
    const topSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
    
    return {
      byCategory,
      topSkills,
      totalExperiences: experiences.length,
    };
  },
});


// Get galaxy visualization data (skills, experiences, achievements for ArcCore)
export const getGalaxyData = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user profile for join date
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Get skills with strength data
    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Aggregate skills by category with strength
    const skillsByCategory = new Map<string, { 
      category: string;
      skills: Array<{ name: string; strength: number; earnedAt: number }>;
      totalStrength: number;
    }>();

    for (const entry of skillsLog) {
      const cat = entry.category || "general";
      if (!skillsByCategory.has(cat)) {
        skillsByCategory.set(cat, { category: cat, skills: [], totalStrength: 0 });
      }
      const catData = skillsByCategory.get(cat)!;
      
      const existingSkill = catData.skills.find(s => s.name === entry.skill);
      if (existingSkill) {
        existingSkill.strength++;
        catData.totalStrength++;
      } else {
        catData.skills.push({ name: entry.skill, strength: 1, earnedAt: entry.earnedAt });
        catData.totalStrength++;
      }
    }

    // Get experiences
    const experiences = await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get achievements/milestones
    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get completed goals for timeline
    const completedGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    // Get completed mini-arcs
    const completedMiniArcs = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "completed"))
      .collect();

    // Get streaks for activity data
    const streaks = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Calculate last activity date
    const allDates = [
      ...skillsLog.map(s => s.earnedAt),
      ...experiences.map(e => e.completedAt),
      ...completedGoals.filter(g => g.completedAt).map(g => g.completedAt!),
    ];
    const lastActivityDate = allDates.length > 0 ? Math.max(...allDates) : Date.now();

    // Find skill categories with low recent activity (for nudges)
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const lowActivityCategories: string[] = [];
    
    skillsByCategory.forEach((data, category) => {
      const recentActivity = data.skills.some(s => s.earnedAt > threeMonthsAgo);
      if (!recentActivity && data.totalStrength > 0) {
        lowActivityCategories.push(category);
      }
    });

    return {
      joinDate: profile?._creationTime || Date.now(),
      skillRings: Array.from(skillsByCategory.values()),
      experiences: experiences.map(e => ({
        id: e._id,
        type: e.type,
        title: e.title,
        category: e.category,
        completedAt: e.completedAt,
      })),
      achievements: achievements.map(a => ({
        id: a._id,
        type: a.type,
        title: a.title,
        icon: a.icon,
        unlockedAt: a.unlockedAt,
      })),
      milestones: [
        ...completedGoals.map(g => ({
          id: g._id,
          type: "goal_completed" as const,
          title: g.title,
          date: g.completedAt || g._creationTime,
        })),
        ...completedMiniArcs.map(a => ({
          id: a._id,
          type: "miniarc_completed" as const,
          title: "Mini-Arc Completed",
          date: a.completedAt || a.startedAt,
        })),
        ...achievements.map(a => ({
          id: a._id,
          type: "achievement" as const,
          title: a.title,
          date: a.unlockedAt,
        })),
      ].sort((a, b) => (a.date || 0) - (b.date || 0)),
      stats: {
        totalGoalsCompleted: completedGoals.length,
        totalMiniArcsCompleted: completedMiniArcs.length,
        totalSkills: new Set(skillsLog.map(s => s.skill)).size,
        totalExperiences: experiences.length,
        currentStreak: profile?.currentStreak || 0,
        longestStreak: profile?.longestStreak || 0,
      },
      lastActivityDate,
      lowActivityCategories,
      activityByMonth: calculateActivityByMonth(streaks, completedGoals),
    };
  },
});

// Helper to calculate activity by month for time filtering
function calculateActivityByMonth(
  streaks: any[], 
  completedGoals: any[]
): Record<string, number> {
  const activity: Record<string, number> = {};
  
  // Count streak days per month
  for (const streak of streaks) {
    const month = streak.date.substring(0, 7); // YYYY-MM
    activity[month] = (activity[month] || 0) + streak.tasksCompleted;
  }
  
  // Count completed goals per month
  for (const goal of completedGoals) {
    if (goal.completedAt) {
      const date = new Date(goal.completedAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      activity[month] = (activity[month] || 0) + 10; // Weight goals higher
    }
  }
  
  return activity;
}
