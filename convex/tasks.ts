import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

export const createTaskWithDetails = mutation({
  args: {
    goalId: v.id("goals"),
    milestoneId: v.optional(v.id("milestones")),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    scheduledDate: v.optional(v.string()), // New
    scheduledTime: v.optional(v.string()), // New
    skills: v.optional(v.array(v.string())), // Skills gained from this task
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the goal belongs to the user
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    // If scheduling a task, validate that we don't exceed 2 tasks per day
    if (args.scheduledDate && args.scheduledTime) {
      const existingTasksOnDate = await ctx.db
        .query("tasks")
        .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
        .filter((q) => q.eq(q.field("scheduledDate"), args.scheduledDate))
        .collect();
      
      if (existingTasksOnDate.length >= 2) {
        throw new Error(`Cannot schedule more than 2 tasks per day. ${args.scheduledDate} already has ${existingTasksOnDate.length} tasks scheduled.`);
      }
    }

    return await ctx.db.insert("tasks", {
      goalId: args.goalId,
      milestoneId: args.milestoneId,
      userId,
      title: args.title,
      description: args.description,
      completed: false,
      order: args.order,
      scheduledDate: args.scheduledDate, // New
      scheduledTime: args.scheduledTime, // New
      skills: args.skills, // Skills for this task
    });
  },
});

export const createTask = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.string(),
    order: v.optional(v.number()),
    scheduledDate: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Id<"tasks">> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the goal belongs to the user
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    const currentMilestone = await ctx.runQuery(api.milestones.getCurrentMilestone);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
      .collect();

    return await ctx.db.insert("tasks", {
      goalId: args.goalId,
      milestoneId: currentMilestone?._id,
      userId,
      title: args.title,
      completed: false,
      order: args.order ?? tasks.length,
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      durationMinutes: args.durationMinutes,
    });
  },
});

export const getTodaysTasks = query({
  args: {},
  handler: async (ctx): Promise<(Doc<"tasks"> & { goalTitle: string; goalCategory: string; })[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentMilestone = await ctx.runQuery(api.milestones.getCurrentMilestone);

    if (!currentMilestone) return [];

    const goal = await ctx.db.get(currentMilestone.goalId);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_milestone", (q) => q.eq("milestoneId", currentMilestone._id))
      .filter((q) => q.eq(q.field("completed"), false))
      .collect();

    return tasks.map((task: Doc<"tasks">) => ({
      ...task,
      goalTitle: (goal && 'title' in goal) ? goal.title : "Untitled Goal",
      goalCategory: (goal && 'category' in goal) ? goal.category : "General",
    })).sort((a, b) => a.order - b.order);
  },
});

export const getTasksForGoal = query({
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
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
    },
});

export const getTask = query({
    args: {
        taskId: v.id("tasks"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.taskId);
    },
});

export const updateTask = mutation({
    args: {
        taskId: v.id("tasks"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        completed: v.optional(v.boolean()),
        completedAt: v.optional(v.number()),
        scheduledDate: v.optional(v.string()),
        scheduledTime: v.optional(v.string()),
        durationMinutes: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const task = await ctx.db.get(args.taskId);
        if (!task || task.userId !== userId) {
            throw new Error("Task not found or unauthorized");
        }

        // Validate scheduling constraints
        if (args.scheduledDate && args.scheduledTime) {
            // Check if there are already 2 tasks scheduled for this date
            const existingTasksOnDate = await ctx.db
                .query("tasks")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.and(
                    q.eq(q.field("scheduledDate"), args.scheduledDate),
                    q.neq(q.field("_id"), args.taskId) // Exclude current task
                ))
                .collect();
            
            if (existingTasksOnDate.length >= 2) {
                throw new Error(`Cannot schedule more than 2 tasks per day. ${args.scheduledDate} already has ${existingTasksOnDate.length} tasks scheduled.`);
            }
        }

        const { taskId, ...rest } = args;
        await ctx.db.patch(taskId, rest);
    },
});

export const getTasksForMilestone = query({
    args: {
        milestoneId: v.id("milestones"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Optional: Verify user has access to the milestone
        const milestone = await ctx.db.get(args.milestoneId);
        if (!milestone || milestone.userId !== userId) {
            console.error("Milestone access error:", {
                milestoneId: args.milestoneId,
                userId,
                milestoneFound: !!milestone,
                milestoneOwner: milestone?.userId,
            });
            throw new Error("Milestone not found or unauthorized");
        }

        return await ctx.db
            .query("tasks")
            .withIndex("by_milestone", (q) => q.eq("milestoneId", args.milestoneId))
            .collect();
    },
});

export const getInternalTasksForGoal = internalQuery({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
    },
});

export const getScheduledTasksForGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // First check if the goal is completed - if so, return no tasks
        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.status === "completed") {
            return [];
        }

        const allTasks = await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();

        // Filter for tasks with scheduledDate and scheduledTime that are not completed
        return allTasks.filter(task => task.scheduledDate && task.scheduledTime && !task.completed);
    },
});

export const getUnscheduledTasksForGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // First check if the goal is completed - if so, return no tasks
        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.status === "completed") {
            return [];
        }

        const allTasks = await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();

        // Filter for tasks without scheduledDate (handles both null and undefined)
        return allTasks.filter(task => !task.scheduledDate);
    },
});

export const getScheduledTasksSummary = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return {};

        const allTasks = await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();

        // Filter for tasks with scheduledDate and scheduledTime that are not completed
        const tasks = allTasks.filter(task => task.scheduledDate && task.scheduledTime && !task.completed);

        // Group tasks by date
        const tasksByDate: Record<string, number> = {};
        for (const task of tasks) {
            if (task.scheduledDate) {
                tasksByDate[task.scheduledDate] = (tasksByDate[task.scheduledDate] || 0) + 1;
            }
        }

        return {
            totalScheduled: tasks.length,
            tasksByDate,
            overbookedDays: Object.entries(tasksByDate).filter(([_, count]) => count > 2)
        };
    },
});

export const getInternalUnscheduledTasksForGoal = internalQuery({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        // Get all tasks for this goal
        const allTasks = await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
        
        // Filter for tasks without scheduledDate (handles both null and undefined)
        return allTasks.filter(task => !task.scheduledDate);
    },
});

export const getInternalScheduledTasksForGoal = internalQuery({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        // Get all tasks for this goal
        const allTasks = await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
        
        // Filter for tasks with both scheduledDate and scheduledTime
        return allTasks.filter(task => task.scheduledDate && task.scheduledTime);
    },
});

export const getAllUserTasks = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        return await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});

export const getInternalAllUserTasks = internalQuery({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tasks")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
    },
});


// Internal mutation for updating tasks from internal actions (no auth required)
export const internalUpdateTask = internalMutation({
    args: {
        taskId: v.id("tasks"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        completed: v.optional(v.boolean()),
        completedAt: v.optional(v.number()),
        scheduledDate: v.optional(v.string()),
        scheduledTime: v.optional(v.string()),
        durationMinutes: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const task = await ctx.db.get(args.taskId);
        if (!task) {
            throw new Error("Task not found");
        }

        const { taskId, ...rest } = args;
        await ctx.db.patch(taskId, rest);
    },
});
