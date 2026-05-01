import { mutation, action, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

export const createMilestone = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
    deadline: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the goal belongs to the user
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    // Validate that the deadline is not in the past
    if (args.deadline) {
      const milestoneDate = new Date(args.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      
      if (milestoneDate < today) {
        throw new Error(`Cannot create milestone with past deadline: ${args.deadline}. All milestone deadlines must be in the future.`);
      }
    }

    return await ctx.db.insert("milestones", {
      goalId: args.goalId,
      userId,
      title: args.title,
      deadline: args.deadline,
      skills: args.skills,
      status: "active",
      order: args.order,
      tasksGenerated: false,
    });
  },
});

export const markTasksAsGenerated = mutation({
    args: {
        milestoneId: v.id("milestones"),
    },
    handler: async (ctx, args) => {
        console.log(`Marking milestone ${args.milestoneId} as tasksGenerated=true`);
        await ctx.db.patch(args.milestoneId, { tasksGenerated: true });
        console.log(`Successfully marked milestone ${args.milestoneId} as tasksGenerated=true`);
    },
});

export const completeMilestone = mutation({
    args: {
        milestoneId: v.id("milestones"),
    },
    handler: async (ctx, args) => {
        const milestone = await ctx.db.get(args.milestoneId);
        if (!milestone) {
            throw new Error("Milestone not found");
        }
        
        // Mark as completed
        await ctx.db.patch(args.milestoneId, { status: "completed" });
        
        // Log skills if milestone has skills
        if (milestone.skills && milestone.skills.length > 0) {
            const goal = await ctx.db.get(milestone.goalId);
            if (goal) {
                await ctx.scheduler.runAfter(0, internal.skillsTracker.logMilestoneSkills, {
                    userId: milestone.userId,
                    milestoneId: args.milestoneId,
                    milestoneTitle: milestone.title,
                    skills: milestone.skills,
                    category: goal.category,
                });
            }
        }
    },
});

export const updateMilestoneDeadline = mutation({
    args: {
        milestoneId: v.id("milestones"),
        newDeadline: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const milestone = await ctx.db.get(args.milestoneId);
        if (!milestone || milestone.userId !== userId) {
            throw new Error("Milestone not found or unauthorized");
        }

        await ctx.db.patch(args.milestoneId, { deadline: args.newDeadline });
    },
});

export const getMilestonesForGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== userId) {
            throw new Error("Goal not found or unauthorized");
        }

        return await ctx.db
            .query("milestones")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
    },
});

// Internal version for use in actions without auth context
export const getInternalMilestonesForGoal = internalQuery({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("milestones")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
    },
});

// Internal mutation for updating milestone deadline (used by AI for milestone shifting)
export const internalUpdateMilestone = internalMutation({
    args: {
        milestoneId: v.id("milestones"),
        deadline: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updateData: any = {};
        if (args.deadline !== undefined) {
            updateData.deadline = args.deadline;
        }
        if (args.status !== undefined) {
            updateData.status = args.status;
        }
        
        if (Object.keys(updateData).length > 0) {
            console.log(`Updating milestone ${args.milestoneId}:`, updateData);
            await ctx.db.patch(args.milestoneId, updateData);
        }
    },
});


export const generateTasksForMilestone = action({
    args: {
        milestoneId: v.id("milestones"),
    },
    handler: async (ctx, args): Promise<string[] | null> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const milestone: Doc<"milestones"> | null = await ctx.runQuery(api.milestones.getMilestone, { milestoneId: args.milestoneId });
        if (!milestone || milestone.userId !== userId) {
            throw new Error("Milestone not found or unauthorized");
        }

        // Check if tasks are already generated to prevent duplicate generation
        if (milestone.tasksGenerated) {
            throw new Error("Tasks have already been generated for this milestone");
        }

        const goal: Doc<"goals"> | null = await ctx.runQuery(api.goals.getGoal, { goalId: milestone.goalId });
        if (!goal || goal.userId !== userId) {
            throw new Error("Goal not found or unauthorized");
        }

        const allMilestones: Doc<"milestones">[] = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId: goal._id });
        const currentMilestoneIndex = allMilestones.findIndex((m: Doc<"milestones">) => m._id === milestone._id);
        const previousMilestones = allMilestones.slice(0, currentMilestoneIndex);

        let previousMilestonesContext = "";
        for (const prevMilestone of previousMilestones) {
            const tasks: Doc<"tasks">[] = await ctx.runQuery(api.tasks.getTasksForMilestone, { milestoneId: prevMilestone._id });
            previousMilestonesContext += `Milestone: ${prevMilestone.title}\nTasks:\n${tasks.map((t: Doc<"tasks">) => `- ${t.title}`).join("\n")}\n\n`;
        }

        return await ctx.runAction(api.goalBreakdownEngine.generateWeeklyTasksForMilestone, {
            goalId: goal._id,
            milestoneId: milestone._id,
            milestoneTitle: milestone.title,
            milestoneDeadline: milestone.deadline,
            goalTitle: goal.title,
            previousMilestonesContext,
        });
    },
});

export const getMilestone = query({
    args: {
        milestoneId: v.id("milestones"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.milestoneId);
    },
});

export const getCurrentMilestone = query({
    args: {},
    handler: async (ctx): Promise<Doc<"milestones"> | null> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const activeGoals = await ctx.db
            .query("goals")
            .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "active"))
            .collect();

        if (activeGoals.length === 0) return null;

        let currentMilestone: Doc<"milestones"> | null = null;

        for (const goal of activeGoals) {
            const milestones = await ctx.db
                .query("milestones")
                .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
                .order("asc")
                .collect();

            for (const milestone of milestones) {
                const tasks = await ctx.db
                    .query("tasks")
                    .withIndex("by_milestone", (q) => q.eq("milestoneId", milestone._id))
                    .filter((q) => q.eq(q.field("completed"), false))
                    .collect();

                if (tasks.length > 0) {
                    currentMilestone = milestone;
                    break; 
                }
            }
            if (currentMilestone) break;
        }

        if (!currentMilestone && activeGoals.length > 0) {
            const lastGoal = activeGoals.sort((a, b) => b._creationTime - a._creationTime)[0];
            const milestones = await ctx.db
                .query("milestones")
                .withIndex("by_goal", (q) => q.eq("goalId", lastGoal._id))
                .order("asc")
                .collect();
            if (milestones.length > 0) {
                currentMilestone = milestones[0];
            }
        }

        return currentMilestone;
    },
});

export const getAllUserMilestones = query({
    args: {},
    handler: async (ctx): Promise<Doc<"milestones">[]> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("milestones")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});
