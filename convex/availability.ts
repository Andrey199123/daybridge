import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const saveAvailability = mutation({
  args: { 
    availability: v.string(),
    goalId: v.optional(v.id("goals")),
    isRescheduling: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(userProfile._id, { availability: args.availability });

    // If a specific goal is provided, schedule tasks for that goal
    if (args.goalId) {
      await ctx.scheduler.runAfter(0, internal.availabilityActions.scheduleTasksForGoal, { 
        userId: userId, 
        goalId: args.goalId,
        isRescheduling: args.isRescheduling
      });
    } else {
      // Otherwise, schedule all active goals
      await ctx.scheduler.runAfter(0, internal.availabilityActions.scheduleGoals, { userId: userId });
    }
  },
});

export const updateScheduledGoals = internalMutation({
    args: { scheduledGoals: v.array(v.object({ _id: v.id("goals"), targetDate: v.string() })) },
    handler: async (ctx, args) => {
        for (const goal of args.scheduledGoals) {
            await ctx.db.patch(goal._id, { targetDate: goal.targetDate });
            const updatedGoal = await ctx.db.get(goal._id);
            if (updatedGoal) {
              await ctx.db.insert("notifications", {
                userId: updatedGoal.userId,
                message: `Your goal "${updatedGoal.title}" has been scheduled for ${new Date(goal.targetDate).toLocaleDateString('en-US')}.`,
                read: false,
              });
            }
        }
    },
});
