import { query, mutation, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { validateCategory, isAllowedCategory } from "./categoryPolicy";

export const getUserGoals = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const goals = args.status
      ? await ctx.db
          .query("goals")
          .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", args.status!))
          .collect()
      : await ctx.db
          .query("goals")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();


    
    // Get tasks for each goal
    const goalsWithTasks = await Promise.all(
      goals.map(async (goal) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect();
        
        const completedTasks = tasks.filter(task => task.completed).length;
        // If goal is completed, show 100% progress regardless of task completion
        const progress = goal.status === "completed" ? 100 : (tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0);
        
        return {
          ...goal,
          tasks: tasks.sort((a, b) => a.order - b.order),
          progress: Math.round(progress),
        };
      })
    );

    return goalsWithTasks;
  },
});

export const getGoalWithMilestones = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;

        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== userId) return null;

        const milestones = await ctx.db
            .query("milestones")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();

        // Calculate progress based on completed tasks
        const tasks = await ctx.db
            .query("tasks")
            .withIndex("by_goal", (q) => q.eq("goalId", args.goalId))
            .collect();
        
        const completedTasks = tasks.filter(task => task.completed).length;
        const progress = goal.status === "completed" ? 100 : (tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0);

        return {
            ...goal,
            milestones: milestones.sort((a, b) => a.order - b.order),
            progress: Math.round(progress),
        };
    },
});


export const createGoal = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    targetDate: v.optional(v.string()),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate category is allowed
    validateCategory(args.category);

    return await ctx.db.insert("goals", {
      userId,
      title: args.title,
      description: args.description,
      category: args.category,
      status: "active",
      priority: args.priority,
      targetDate: args.targetDate,
      aiGenerated: args.aiGenerated ?? false,
      availabilityChatCompleted: false,
    });
  },
});

export const createGoalWithAI = action({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    priority: v.string(),
    targetDate: v.optional(v.string()),
    smartGoal: v.optional(v.object({
      specific: v.string(),
      measurable: v.string(),
      achievable: v.string(),
      relevant: v.string(),
      timeBound: v.string(),
    })),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // Create the goal first
    const goalId: any = await ctx.runMutation(api.goals.createGoal, {
      title: args.title,
      description: args.description,
      category: args.category,
      priority: args.priority,
      targetDate: args.targetDate,
      aiGenerated: true,
    });

    // Get the userId for milestone scheduling
    const userId = await getAuthUserId(ctx);
    
    // Generate milestones FIRST so we can assign tasks to the first milestone
    await ctx.runAction(api.goalBreakdownEngine.generateMilestonesForGoal, {
        goalId,
        goalTitle: args.title,
        goalDescription: args.description,
        category: args.category,
        targetDate: args.targetDate,
        userId: userId || undefined,
    });

    // Get the first milestone to assign initial tasks to it
    const milestones: Doc<"milestones">[] = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId });
    const firstMilestone = milestones.length > 0 ? milestones.sort((a, b) => a.order - b.order)[0] : null;

    // Generate tasks using AI and assign to first milestone
    await ctx.runAction(api.ai.generateTasksForGoal, {
      goalId,
      goalTitle: args.title,
      goalDescription: args.description,
      category: args.category,
      milestoneId: firstMilestone?._id,
    });

    // Mark the first milestone as having tasks generated
    if (firstMilestone) {
      await ctx.runMutation(api.milestones.markTasksAsGenerated, { milestoneId: firstMilestone._id });
    }

    return goalId;
  },
});

export const toggleTask = action({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args): Promise<{ 
    completed: boolean; 
    goalCompleted?: boolean; 
    milestoneCompleted?: boolean;
    goalTitle?: string;
    xpEarned: number;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task: Doc<"tasks"> | null = await ctx.runQuery(api.tasks.getTask, { taskId: args.taskId });
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    const completed: boolean = !task.completed;
    let goalCompleted = false;
    let milestoneCompleted = false;
    let goalTitle = "";
    let xpEarned = 0;
    
    await ctx.runMutation(internal.tasks.internalUpdateTask, {
      taskId: args.taskId,
      completed,
      completedAt: completed ? Date.now() : undefined,
    });

    // If a task was completed, check if its parent milestone is now complete
    if (completed && task.milestoneId) {
        const tasksForMilestone = await ctx.runQuery(api.tasks.getTasksForMilestone, { milestoneId: task.milestoneId });
        const allTasksInMilestoneCompleted = tasksForMilestone.every((t: Doc<"tasks">) => t._id === task._id || t.completed);

        if (allTasksInMilestoneCompleted) {
            await ctx.runMutation(api.milestones.completeMilestone, { milestoneId: task.milestoneId });
            milestoneCompleted = true;
            
            // Award XP for completing a milestone
            await ctx.runMutation(api.users.addPoints, { points: 100 });
            xpEarned += 100;
            await ctx.runMutation(api.notifications.createNotification, {
              message: `Milestone completed! +100 XP 🎯`,
            });
            
            // Now check if the entire goal is complete
            const allMilestones = await ctx.runQuery(api.milestones.getMilestonesForGoal, { goalId: task.goalId });
            if (allMilestones.every((m: Doc<"milestones">) => m.status === 'completed' || m._id === task.milestoneId)) {
                const goal = await ctx.runQuery(api.goals.getGoal, { goalId: task.goalId });
                goalTitle = goal?.title || "";
                goalCompleted = true;
                
                await ctx.runMutation(api.goals.completeGoal, { goalId: task.goalId });
                await ctx.runMutation(api.users.incrementGoalsCompleted, {});
                await ctx.runMutation(api.users.addPoints, { points: 250 });
                xpEarned += 250;
                await ctx.runMutation(api.notifications.createNotification, {
                  message: `Care plan completed: ${goalTitle} +250 care points`,
                });
                
                // Check and award achievements
                const userProfile = await ctx.runQuery(api.users.getCurrentUser, {});
                if (userProfile?.profile) {
                  const awarded = await ctx.runMutation(internal.achievements.checkAndAwardAchievements, {
                    userId,
                    totalGoalsCompleted: userProfile.profile.totalGoalsCompleted || 0, // Don't add 1 - already incremented above
                    currentStreak: userProfile.profile.currentStreak || 0,
                  });
                  if (awarded && awarded.length > 0) {
                    for (const achievementType of awarded) {
                      await ctx.runMutation(api.notifications.createNotification, {
                        message: `Milestone unlocked: ${achievementType === 'first_mission' ? 'First Care Plan' : achievementType}!`,
                      });
                    }
                  }
                }
                
                // Log experience for the completed goal
                if (goal) {
                  // Collect all skills from milestones
                  const allSkills: string[] = [];
                  for (const m of allMilestones) {
                    if (m.skills) {
                      allSkills.push(...m.skills);
                    }
                  }
                  const uniqueSkills = [...new Set(allSkills)];
                  
                  await ctx.runMutation(internal.skillsTracker.logGoalExperience, {
                    userId,
                    goalId: task.goalId,
                    goalTitle: goal.title,
                    goalDescription: goal.description,
                    category: goal.category,
                    skills: uniqueSkills,
                  });
                }
            }
        }
    }

    // Log task completion for streak tracking
    if (completed) {
        await ctx.runMutation(api.streaks.logTaskCompletion, { goalId: task.goalId });
        await ctx.runMutation(api.users.addPoints, { points: 25 });
        xpEarned += 25;
    }

    // Update streak
    await ctx.runAction(api.streaks.updateStreak, {});

    return { completed, goalCompleted, milestoneCompleted, goalTitle, xpEarned };
  },
});

export const completeGoal = mutation({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.goalId, {
            status: "completed",
            completedAt: Date.now(),
        });
    },
});

export const updateGoalCompletionDetails = mutation({
    args: {
        goalId: v.id("goals"),
        completionDetails: v.object({
            result: v.optional(v.string()),
            feedback: v.optional(v.string()),
            whatWentWell: v.optional(v.string()),
            whatCouldImprove: v.optional(v.string()),
            skillsGained: v.optional(v.array(v.string())),
        }),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const goal = await ctx.db.get(args.goalId);
        if (!goal) throw new Error("Goal not found");
        if (goal.userId !== userId) throw new Error("Not authorized");

        await ctx.db.patch(args.goalId, {
            completionDetails: args.completionDetails,
        });
    },
});

export const getGoalTemplates = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("goalTemplates")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }

    return await ctx.db.query("goalTemplates").collect();
  },
});

export const getGoal = query({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.goalId);
    },
});

export const generateMilestones = action({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const goal = await ctx.runQuery(api.goals.getGoal, { goalId: args.goalId });
        if (!goal) {
            throw new Error("Goal not found");
        }

        // Generate milestones using AI (pass userId for availability-aware deadline scheduling)
        await ctx.runAction(api.goalBreakdownEngine.generateMilestonesForGoal, {
            goalId: goal._id,
            goalTitle: goal.title,
            goalDescription: goal.description,
            category: goal.category,
            targetDate: goal.targetDate,
            userId: goal.userId,
        });
    },
});

export const deleteGoal = mutation({
    args: {
        goalId: v.id("goals"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== userId) {
            throw new Error("Goal not found or unauthorized");
        }

        // 1. Delete all tasks associated with the goal
        const tasks = await ctx.db.query("tasks").withIndex("by_goal", q => q.eq("goalId", args.goalId)).collect();
        await Promise.all(tasks.map(task => ctx.db.delete(task._id)));

        // 2. Delete all milestones associated with the goal
        const milestones = await ctx.db.query("milestones").withIndex("by_goal", q => q.eq("goalId", args.goalId)).collect();
        await Promise.all(milestones.map(milestone => ctx.db.delete(milestone._id)));

        // 3. Delete the goal itself
        await ctx.db.delete(args.goalId);
    },
});

export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Goal not found or unauthorized");
    }

    return await ctx.db.patch(args.goalId, {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
    });
  },
});

export const searchGoals = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    if (!args.query) {
      return [];
    }

    return await ctx.db
      .query("goals")
      .withSearchIndex("by_title", (q) =>
        q.search("title", args.query).eq("userId", userId)
      )
      .collect();
  },
});

export const deleteCompletedGoals = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const completedGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .collect();

    await Promise.all(
      completedGoals.map(async (goal) => {
        // 1. Delete all tasks associated with the goal
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect();
        await Promise.all(tasks.map((task) => ctx.db.delete(task._id)));

        // 2. Delete all milestones associated with the goal
        const milestones = await ctx.db
          .query("milestones")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect();
        await Promise.all(
          milestones.map((milestone) => ctx.db.delete(milestone._id))
        );

        // 3. Delete the goal itself
        await ctx.db.delete(goal._id);
      })
    );
  },
});

export const getGoalSuggestions = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) return [];

    const suggestions = await ctx.db
      .query("goalTemplates")
      .filter((q) =>
        q.or(
          ...userProfile.interests.map((interest) =>
            q.eq(q.field("category"), interest)
          )
        )
      )
      .take(5);

    return suggestions;
  },
});

export const getActiveGoals = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId as Id<"users">).eq("status", "active")
      )
      .collect();
  },
});

export const getAllUserGoals = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as Id<"users">))
      .collect();
  },
});

export const getInternalGoal = internalQuery({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.goalId);
    },
});

export const markAvailabilityChatCompleted = mutation({
    args: {
        goalId: v.id("goals"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        // Verify the goal belongs to the user
        const goal = await ctx.db.get(args.goalId);
        if (!goal || goal.userId !== userId) {
            throw new Error("Goal not found or unauthorized");
        }

        await ctx.db.patch(args.goalId, {
            availabilityChatCompleted: true,
        });
    },
});
