import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal, api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// ============================================
// ADAPTIVE PERSONALIZATION ENGINE
// ============================================

// Get user's skill profile for adaptive task generation
export const getUserSkillProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get all logged skills
    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .collect();

    // Count skill occurrences (more occurrences = more proficient)
    const skillCounts: Record<string, number> = {};
    for (const log of skillsLog) {
      skillCounts[log.skill] = (skillCounts[log.skill] || 0) + 1;
    }

    // Categorize skills by proficiency level
    const acquiredSkills = Object.entries(skillCounts)
      .filter(([_, count]) => count >= 1)
      .map(([skill, count]) => ({
        skill,
        proficiency: count >= 5 ? "advanced" : count >= 2 ? "intermediate" : "beginner",
        count,
      }));

    // Get completed goals for context
    const completedGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) => q.eq("userId", userId as Id<"users">).eq("status", "completed"))
      .collect();

    return {
      acquiredSkills,
      totalSkillsLogged: skillsLog.length,
      completedGoalsCount: completedGoals.length,
      categories: [...new Set(completedGoals.map((g) => g.category))],
    };
  },
});

// Internal query for use in actions
export const getInternalUserSkillProfile = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const skillsLog = await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as Id<"users">))
      .collect();

    const skillCounts: Record<string, number> = {};
    for (const log of skillsLog) {
      skillCounts[log.skill] = (skillCounts[log.skill] || 0) + 1;
    }

    return {
      acquiredSkills: Object.keys(skillCounts),
      skillProficiency: skillCounts,
    };
  },
});

// ============================================
// WEEKLY CHECK-IN SYSTEM
// ============================================

// Get check-in status for a goal
export const getCheckInStatus = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) return null;

    // Get all tasks for this goal
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    const completedTasks = tasks.filter((t) => t.completed);
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

    // Get milestones
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    const completedMilestones = milestones.filter((m) => m.status === "completed");

    // Calculate days since goal creation
    const daysSinceCreation = Math.floor(
      (Date.now() - goal._creationTime) / (1000 * 60 * 60 * 24)
    );

    // Determine if check-in is needed (every 2 weeks)
    const weeksSinceCreation = Math.floor(daysSinceCreation / 7);
    const needsCheckIn = weeksSinceCreation > 0 && weeksSinceCreation % 2 === 0;

    // Calculate expected progress based on deadline
    let expectedProgress = 0;
    if (goal.targetDate) {
      const targetDate = new Date(goal.targetDate);
      const creationDate = new Date(goal._creationTime);
      const totalDays = (targetDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysElapsed = daysSinceCreation;
      expectedProgress = Math.min(100, (daysElapsed / totalDays) * 100);
    }

    const isOnTrack = progress >= expectedProgress - 10; // 10% buffer

    return {
      progress: Math.round(progress),
      expectedProgress: Math.round(expectedProgress),
      isOnTrack,
      needsCheckIn,
      completedTasks: completedTasks.length,
      totalTasks,
      completedMilestones: completedMilestones.length,
      totalMilestones: milestones.length,
      daysSinceCreation,
      weeksSinceCreation,
    };
  },
});

// Get all goals needing check-in
export const getGoalsNeedingCheckIn = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const activeGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) => q.eq("userId", userId as Id<"users">).eq("status", "active"))
      .collect();

    const goalsNeedingCheckIn = [];

    for (const goal of activeGoals) {
      const daysSinceCreation = Math.floor(
        (Date.now() - goal._creationTime) / (1000 * 60 * 60 * 24)
      );
      const weeksSinceCreation = Math.floor(daysSinceCreation / 7);

      // Check-in needed every 2-4 weeks
      if (weeksSinceCreation >= 2 && weeksSinceCreation % 2 === 0) {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect();

        const completedTasks = tasks.filter((t) => t.completed).length;
        const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

        goalsNeedingCheckIn.push({
          ...goal,
          progress: Math.round(progress),
          weeksSinceCreation,
        });
      }
    }

    return goalsNeedingCheckIn;
  },
});

// ============================================
// BUFFERING & DEADLINE SHIFTING
// ============================================

// Add buffer weeks to a goal (shifts all milestone deadlines)
export const addBufferWeeks = mutation({
  args: {
    goalId: v.id("goals"),
    bufferWeeks: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    // Get all milestones for this goal
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    // Shift each milestone deadline by buffer weeks
    for (const milestone of milestones) {
      if (milestone.deadline) {
        const currentDeadline = new Date(milestone.deadline);
        currentDeadline.setDate(currentDeadline.getDate() + args.bufferWeeks * 7);
        const newDeadline = currentDeadline.toISOString().split("T")[0];

        await ctx.db.patch(milestone._id, { deadline: newDeadline });
      }
    }

    // Also shift the goal's target date if it exists
    if (goal.targetDate) {
      const currentTarget = new Date(goal.targetDate);
      currentTarget.setDate(currentTarget.getDate() + args.bufferWeeks * 7);
      const newTargetDate = currentTarget.toISOString().split("T")[0];

      await ctx.db.patch(args.goalId, { targetDate: newTargetDate });
    }

    // Reschedule tasks that have scheduled dates
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    for (const task of tasks) {
      if (task.scheduledDate && !task.completed) {
        const currentDate = new Date(task.scheduledDate);
        currentDate.setDate(currentDate.getDate() + args.bufferWeeks * 7);
        const newScheduledDate = currentDate.toISOString().split("T")[0];

        await ctx.db.patch(task._id, { scheduledDate: newScheduledDate });
      }
    }

    return { success: true, bufferWeeksAdded: args.bufferWeeks };
  },
});

// Shift goal deadline (recalculates milestone spacing)
export const shiftGoalDeadline = mutation({
  args: {
    goalId: v.id("goals"),
    newTargetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    const oldTargetDate = goal.targetDate ? new Date(goal.targetDate) : null;
    const newTargetDate = new Date(args.newTargetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newTargetDate <= today) {
      throw new Error("New deadline must be in the future");
    }

    // Update goal's target date
    await ctx.db.patch(args.goalId, { targetDate: args.newTargetDate });

    // Get all active milestones
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    if (milestones.length === 0) return { success: true };

    // Sort milestones by order
    const sortedMilestones = milestones.sort((a, b) => a.order - b.order);

    // Calculate new spacing
    const totalDays = Math.floor(
      (newTargetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysPerMilestone = Math.floor(totalDays / sortedMilestones.length);

    // Update each milestone's deadline with even spacing
    for (let i = 0; i < sortedMilestones.length; i++) {
      const milestone = sortedMilestones[i];
      const newDeadline = new Date(today);
      newDeadline.setDate(newDeadline.getDate() + daysPerMilestone * (i + 1));

      // Ensure last milestone is a few days before goal deadline
      if (i === sortedMilestones.length - 1) {
        newDeadline.setDate(newTargetDate.getDate() - 3);
      }

      const deadlineStr = newDeadline.toISOString().split("T")[0];
      await ctx.db.patch(milestone._id, { deadline: deadlineStr });
    }

    return { success: true, milestonesUpdated: sortedMilestones.length };
  },
});

// Skip a task (marks as skipped and handles carry-over)
export const skipTask = mutation({
  args: {
    taskId: v.id("tasks"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    // Mark task as completed but with a "skipped" indicator in description
    const skipNote = args.reason
      ? `[SKIPPED: ${args.reason}]`
      : "[SKIPPED]";

    const newDescription = task.description
      ? `${skipNote} ${task.description}`
      : skipNote;

    await ctx.db.patch(args.taskId, {
      completed: true,
      completedAt: Date.now(),
      description: newDescription,
    });

    return { success: true, taskId: args.taskId };
  },
});

// Reschedule a task to a new date
export const rescheduleTask = mutation({
  args: {
    taskId: v.id("tasks"),
    newDate: v.string(),
    newTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    // Check if new date already has 2 tasks
    const existingTasksOnDate = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
      .filter((q) =>
        q.and(
          q.eq(q.field("scheduledDate"), args.newDate),
          q.neq(q.field("_id"), args.taskId)
        )
      )
      .collect();

    if (existingTasksOnDate.length >= 2) {
      throw new Error(
        `Cannot reschedule: ${args.newDate} already has 2 tasks scheduled`
      );
    }

    await ctx.db.patch(args.taskId, {
      scheduledDate: args.newDate,
      scheduledTime: args.newTime || task.scheduledTime,
    });

    return { success: true };
  },
});

// Adjust goal pace (faster or slower)
export const adjustGoalPace = mutation({
  args: {
    goalId: v.id("goals"),
    paceAdjustment: v.union(v.literal("faster"), v.literal("slower")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    // Get active milestones
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const sortedMilestones = milestones.sort((a, b) => a.order - b.order);

    // Adjust milestone deadlines
    const adjustmentDays = args.paceAdjustment === "faster" ? -7 : 7; // 1 week adjustment

    for (const milestone of sortedMilestones) {
      if (milestone.deadline) {
        const currentDeadline = new Date(milestone.deadline);
        currentDeadline.setDate(currentDeadline.getDate() + adjustmentDays);

        // Don't allow deadlines in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentDeadline > today) {
          const newDeadline = currentDeadline.toISOString().split("T")[0];
          await ctx.db.patch(milestone._id, { deadline: newDeadline });
        }
      }
    }

    // Adjust goal target date if it exists
    if (goal.targetDate) {
      const currentTarget = new Date(goal.targetDate);
      currentTarget.setDate(currentTarget.getDate() + adjustmentDays);
      const newTargetDate = currentTarget.toISOString().split("T")[0];
      await ctx.db.patch(args.goalId, { targetDate: newTargetDate });
    }

    return {
      success: true,
      adjustment: args.paceAdjustment,
      milestonesAdjusted: sortedMilestones.length,
    };
  },
});
