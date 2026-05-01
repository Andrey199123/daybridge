import { query, mutation, action, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Keep whatever the frontend sends ("9th" | "10th" | "11th" | "12th" | "N/A")
// Store strings going forward.
// (Old rows with numbers still pass because the schema now allows both.)

function getSiteUrl() {
  return (
    process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.CONVEX_SITE_URL ||
    "https://daybridge.app"
  ).replace(/\/$/, "");
}

function getResendSender(defaultName: string) {
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM_ADDRESS ||
    "hello@daybridge.app";
  const fromName =
    process.env.RESEND_FROM_NAME ||
    process.env.EMAIL_FROM_NAME ||
    defaultName;

  return `${fromName} <${fromEmail}>`;
}

export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const authUser = await ctx.db.get(userId);

    if (profile) {
      // User profile found
    }

    return {
      id: userId,
      email: authUser?.email,
      isAnonymous: authUser?.isAnonymous ?? false,
      profile: profile,
    };
  },
});

export const createProfile = mutation({
  args: {
    name: v.string(),
    grade: v.string(), // accept UI strings directly
    interests: v.array(v.string()),
    growthFocus: v.string(),
    bigGoal: v.string(),
    coreSkills: v.string(),
    motivationLevel: v.string(),
    pictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const profileData = {
      userId,
      name: args.name,
      grade: args.grade,
      interests: args.interests,
      growthFocus: args.growthFocus,
      bigGoal: args.bigGoal,
      coreSkills: args.coreSkills,
      motivationLevel: args.motivationLevel,
      completedOnboarding: true, // Always set to true on profile creation/update
      pictureUrl: args.pictureUrl,
    };

    if (existingProfile) {
      // If profile exists, patch it with new data and ensure onboarding is complete
      await ctx.db.patch(existingProfile._id, profileData);
      return existingProfile._id;
    } else {
      // If profile doesn't exist, insert a new one
      return await ctx.db.insert("userProfiles", {
        ...profileData,
        currentStreak: 0,
        longestStreak: 0,
        totalGoalsCompleted: 0,
        darkMode: true,
        points: 0,
      });
    }
  },
});

export const ensureOnboardingCompleted = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile && !profile.completedOnboarding) {
      await ctx.db.patch(profile._id, { completedOnboarding: true });
    }
  },
});

export const ensureGuestProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      return existingProfile._id;
    }

    return await ctx.db.insert("userProfiles", {
      userId,
      name: "Guest",
      interests: [],
      completedOnboarding: false,
      completedTutorial: false,
      onboardingStep: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalGoalsCompleted: 0,
      darkMode: true,
      points: 0,
      coins: 0,
      grade: "N/A",
    });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    birthday: v.optional(v.string()),
    grade: v.optional(v.string()), // optional string
    interests: v.optional(v.array(v.string())),
    growthFocus: v.optional(v.string()),
    bigGoal: v.optional(v.string()),
    coreSkills: v.optional(v.string()),
    motivationLevel: v.optional(v.string()),
    darkMode: v.optional(v.boolean()),
    pictureUrl: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    schoolCity: v.optional(v.string()),
    schoolState: v.optional(v.string()),
    gender: v.optional(v.string()),
    raceEthnicity: v.optional(v.array(v.string())),
    availability: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    return await ctx.db.patch(profile._id, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.birthday !== undefined && { birthday: args.birthday }),
      ...(args.grade !== undefined && { grade: args.grade }),
      ...(args.interests !== undefined && { interests: args.interests }),
      ...(args.growthFocus !== undefined && { growthFocus: args.growthFocus }),
      ...(args.bigGoal !== undefined && { bigGoal: args.bigGoal }),
      ...(args.coreSkills !== undefined && { coreSkills: args.coreSkills }),
      ...(args.motivationLevel !== undefined && { motivationLevel: args.motivationLevel }),
      ...(args.darkMode !== undefined && { darkMode: args.darkMode }),
      ...(args.pictureUrl !== undefined && { pictureUrl: args.pictureUrl }),
      ...(args.city !== undefined && { city: args.city }),
      ...(args.state !== undefined && { state: args.state }),
      ...(args.schoolName !== undefined && { schoolName: args.schoolName }),
      ...(args.schoolCity !== undefined && { schoolCity: args.schoolCity }),
      ...(args.schoolState !== undefined && { schoolState: args.schoolState }),
      ...(args.gender !== undefined && { gender: args.gender }),
      ...(args.raceEthnicity !== undefined && { raceEthnicity: args.raceEthnicity }),
      ...(args.availability !== undefined && { availability: args.availability }),
    });
  },
});

export const updateEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Update the email in the users table
    await ctx.db.patch(userId, {
      email: args.email,
    });

    return { success: true };
  },
});

export const addPoints = mutation({
  args: {
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check for active XP multiplier
    const now = Date.now();
    const multiplier = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "xp_multiplier"))
      .filter((q) => q.and(
        q.eq(q.field("active"), true),
        q.or(
          q.eq(q.field("expiresAt"), undefined),
          q.gt(q.field("expiresAt"), now)
        )
      ))
      .first();

    const finalPoints = multiplier ? args.points * 2 : args.points;

    // Also award coins (1 coin per 10 XP)
    const coinsToAward = Math.floor(finalPoints / 10);

    return await ctx.db.patch(profile._id, {
      points: (profile.points || 0) + finalPoints,
      coins: (profile.coins || 0) + coinsToAward,
    });
  },
});

export const addCoins = mutation({
  args: {
    coins: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    return await ctx.db.patch(profile._id, {
      coins: (profile.coins || 0) + args.coins,
    });
  },
});

export const updateStreak = mutation({
  args: {
    currentStreak: v.number(),
    longestStreak: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    return await ctx.db.patch(profile._id, {
      currentStreak: args.currentStreak,
      longestStreak: args.longestStreak,
    });
  },
});

export const incrementGoalsCompleted = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    return await ctx.db.patch(profile._id, {
      totalGoalsCompleted: (profile.totalGoalsCompleted || 0) + 1,
    });
  },
});

export const startOnboarding = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    return await ctx.db.patch(profile._id, {
      completedOnboarding: false,
    });
  },
});

export const getProfilePictureUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const deleteUser = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Delete user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile) {
      await ctx.db.delete(profile._id);
    }

    // 2. Delete goals and their associated tasks and milestones
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(
      goals.map(async (goal) => {
        // Delete tasks
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect();
        await Promise.all(tasks.map((task) => ctx.db.delete(task._id)));

        // Delete milestones
        const milestones = await ctx.db
          .query("milestones")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect();
        await Promise.all(
          milestones.map((milestone) => ctx.db.delete(milestone._id))
        );

        // Delete goal
        await ctx.db.delete(goal._id);
      })
    );

    // 3. Delete streaks
    const streaks = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(streaks.map((streak) => ctx.db.delete(streak._id)));

    // 4. Delete the user from the auth system
    await ctx.db.delete(userId);
  },
});

export const getLeaderboard = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_points")
      .order("desc")
      .take(10);
  },
});

export const getProgressReport = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const userGoals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tasks = await Promise.all(
      userGoals.map((goal) =>
        ctx.db
          .query("tasks")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect()
      )
    ).then((tasks) => tasks.flat());

    const completedTasks = tasks.filter((task) => task.completed);

    const progressData = completedTasks.reduce((acc, task) => {
      if (!task.completedAt) return acc;
      const date = new Date(task.completedAt).toISOString().split("T")[0];
      const existingEntry = acc.find((entry) => entry.date === date);
      if (existingEntry) {
        existingEntry.progress += 1;
      } else {
        acc.push({ date, progress: 1 });
      }
      return acc;
    }, [] as { date: string; progress: number }[]);

    return progressData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  },
});

export const sendWeeklySummaryEmails = internalAction({
  handler: async (ctx) => {
    const users = await ctx.runQuery(api.users.getActiveUsers);
    for (const user of users) {
      const completedGoals = await ctx.runQuery(api.goals.getUserGoals, {
        status: "completed",
      });
      const emailBody = `
        <h1>Weekly Progress Summary</h1>
        <p>Hi ${user.name},</p>
        <p>Here's a summary of your progress this week:</p>
        <ul>
          ${completedGoals
            .map((goal: Doc<"goals">) => `<li>${goal.title}</li>`)
            .join("")}
        </ul>
        <p>Keep up the great work!</p>
      `;
      console.log(`Emailing ${user.name}`);
    }
  },
});

export const sendMonthlySummaryEmails = internalAction({
  handler: async (ctx) => {
    const users = await ctx.runQuery(api.users.getActiveUsers);
    for (const user of users) {
      const completedGoals = await ctx.runQuery(api.goals.getUserGoals, {
        status: "completed",
      });
      const emailBody = `
        <h1>Monthly Progress Summary</h1>
        <p>Hi ${user.name},</p>
        <p>Here's a summary of your progress this month:</p>
        <ul>
          ${completedGoals
            .map((goal: Doc<"goals">) => `<li>${goal.title}</li>`)
            .join("")}
        </ul>
        <p>Keep up the great work!</p>
      `;
      console.log(`Emailing ${user.name}`);
    }
  },
});

export const sendYearlySummaryEmails = internalAction({
  handler: async (ctx) => {
    const users = await ctx.runQuery(api.users.getActiveUsers);
    for (const user of users) {
      const completedGoals = await ctx.runQuery(api.goals.getUserGoals, {
        status: "completed",
      });
      const emailBody = `
        <h1>Yearly Progress Summary</h1>
        <p>Hi ${user.name},</p>
        <p>Here's a summary of your progress this year:</p>
        <ul>
          ${completedGoals
            .map((goal: Doc<"goals">) => `<li>${goal.title}</li>`)
            .join("")}
        </ul>
        <p>Keep up the great work!</p>
      `;
      console.log(`Emailing ${user.name}`);
    }
  },
});

export const getActiveUsers = query({
  handler: async (ctx) => {
    return await ctx.db.query("userProfiles").collect();
  },
});

export const referFriend = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user || !user.profile) {
      throw new Error("User profile not found.");
    }

    const referrerName = user.profile.name;
    const subject = `${referrerName} invited you to join DayBridge!`;

    // In a real app, you would fetch this from a file or a template service.
    // For simplicity here, we'll define it as a string.
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're invited to join DayBridge!</title>
    <style>
        body {
            font-family: sans-serif;
            background-color: #f4f4f4;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
        }
        .header {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 20px;
        }
        .content p {
            margin-bottom: 15px;
        }
        .button {
            display: block;
            width: 200px;
            margin: 20px auto;
            padding: 15px;
            background-color: #007bff;
            color: #ffffff;
            text-align: center;
            text-decoration: none;
            border-radius: 5px;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #777;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            You've been invited to join DayBridge!
        </div>
        <div class="content">
            <p>Hi there,</p>
            <p><strong>${referrerName}</strong> has invited you to join DayBridge, a daily support planner for older adults and care circles.</p>
            <p>Click the button below to get started!</p>
            <a href="${getSiteUrl()}" class="button">Sign Up Now</a>
        </div>
        <div class="footer">
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>`;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not set. Skipping email sending.");
      // Fallback to console logging if API key is missing
      console.log(`
        To: ${args.email}
        Subject: ${subject}
        Body: (HTML content not shown)
      `);
      // Still return success to the user, but log the issue.
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
            from: getResendSender("DayBridge"),
            to: args.email,
            subject: subject,
            html: emailHtml,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to send email: ${errorBody}`);
    }

    // In a real application, you would have a mechanism to track referrals
    // and award points when the friend signs up.
  },
});

export const exportData = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const tasks = await Promise.all(
      goals.map((goal) =>
        ctx.db
          .query("tasks")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect()
      )
    ).then((tasks) => tasks.flat());

    const milestones = await Promise.all(
      goals.map((goal) =>
        ctx.db
          .query("milestones")
          .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
          .collect()
      )
    ).then((milestones) => milestones.flat());

    return {
      userProfile,
      goals,
      tasks,
      milestones,
    };
  },
});

export const getInternalUserProfile = internalQuery({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .unique();
    },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Using .first() instead of .unique() to handle duplicate emails gracefully
    // Run deleteDuplicateEmailUsers mutation to clean up duplicates
    return ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Onboarding mutations
export const saveOnboardingProgress = mutation({
  args: {
    step: v.number(),
    data: v.object({
      name: v.optional(v.string()),
      interests: v.optional(v.array(v.string())),
      motivationLevel: v.optional(v.string()),
      skills: v.optional(v.array(v.string())),
      programs: v.optional(v.array(v.object({
        title: v.string(),
        organization: v.string(),
        role: v.optional(v.string()),
        monthYear: v.string(),
        description: v.optional(v.string()),
      }))),
      awards: v.optional(v.array(v.object({
        title: v.string(),
        issuer: v.string(),
        monthYear: v.string(),
        description: v.optional(v.string()),
      }))),
      grade: v.optional(v.string()),
      birthday: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      schoolName: v.optional(v.string()),
      schoolCity: v.optional(v.string()),
      schoolState: v.optional(v.string()),
      gender: v.optional(v.string()),
      raceEthnicity: v.optional(v.array(v.string())),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        onboardingStep: args.step,
        ...(args.data.name && { name: args.data.name }),
        ...args.data,
      });
    } else {
      // Create minimal profile with progress
      await ctx.db.insert("userProfiles", {
        userId,
        name: args.data.name || "User", // Use provided name or placeholder
        interests: args.data.interests || [],
        completedOnboarding: false,
        onboardingStep: args.step,
        currentStreak: 0,
        longestStreak: 0,
        totalGoalsCompleted: 0,
        darkMode: true,
        points: 0,
        grade: args.data.grade || "N/A",
        ...args.data,
      });
    }
    return null;
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    interests: v.array(v.string()),
    motivationLevel: v.string(),
    skills: v.array(v.string()),
    programs: v.optional(v.array(v.object({
      title: v.string(),
      organization: v.string(),
      role: v.optional(v.string()),
      monthYear: v.string(),
      description: v.optional(v.string()),
    }))),
    awards: v.optional(v.array(v.object({
      title: v.string(),
      issuer: v.string(),
      monthYear: v.string(),
      description: v.optional(v.string()),
    }))),
    grade: v.string(),
    birthday: v.string(),
    city: v.string(),
    state: v.string(),
    schoolName: v.string(),
    schoolCity: v.string(),
    schoolState: v.string(),
    gender: v.optional(v.string()),
    raceEthnicity: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const profileData = {
      name: args.name,
      interests: args.interests,
      motivationLevel: args.motivationLevel,
      skills: args.skills,
      programs: args.programs || [],
      awards: args.awards || [],
      grade: args.grade,
      birthday: args.birthday,
      city: args.city,
      state: args.state,
      schoolName: args.schoolName,
      schoolCity: args.schoolCity,
      schoolState: args.schoolState,
      gender: args.gender,
      raceEthnicity: args.raceEthnicity || [],
      completedOnboarding: true,
      onboardingStep: 11, // All steps complete
    };

    if (profile) {
      await ctx.db.patch(profile._id, profileData);
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        ...profileData,
        currentStreak: 0,
        longestStreak: 0,
        totalGoalsCompleted: 0,
        darkMode: true,
        points: 0,
      });
    }
    return null;
  },
});

export const updateUserPreferences = mutation({
  args: {
    theme: v.optional(v.string()),
    motion: v.optional(v.string()),
    sound: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const currentPrefs = profile.preferences || {};
    
    await ctx.db.patch(profile._id, {
      preferences: {
        ...currentPrefs,
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.motion !== undefined && { motion: args.motion }),
        ...(args.sound !== undefined && { sound: args.sound }),
      },
    });

    return null;
  },
});

// ============================================================================
// TUTORIAL MANAGEMENT
// ============================================================================

/**
 * Mark tutorial as completed for the current user
 */
export const completeTutorial = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(profile._id, {
      completedTutorial: true,
    });

    return { success: true };
  },
});

/**
 * Reset tutorial (for replay)
 */
export const resetTutorial = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(profile._id, {
      completedTutorial: false,
    });

    return { success: true };
  },
});

// Get XP Leaderboard (top 10 users by points)
export const getXPLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_points")
      .order("desc")
      .take(10);

    return profiles.map((profile, index) => ({
      rank: index + 1,
      name: profile.name,
      points: profile.points || 0,
      pictureUrl: profile.pictureUrl,
    }));
  },
});

// Get Streak Leaderboard (top 10 users by current streak)
export const getStreakLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db
      .query("userProfiles")
      .collect();

    // Sort by currentStreak descending
    const sorted = profiles
      .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
      .slice(0, 10);

    return sorted.map((profile, index) => ({
      rank: index + 1,
      name: profile.name,
      currentStreak: profile.currentStreak || 0,
      pictureUrl: profile.pictureUrl,
    }));
  },
});


// Admin query to get all users
export const getAllUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      emailVerificationTime: user.emailVerificationTime,
    }));
  },
});
