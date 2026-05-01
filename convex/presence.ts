import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Update user's last active timestamp
export const updatePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        lastActiveAt: Date.now(),
      });
    }
  },
});

// Check if a user is online (active within last 5 minutes)
export const isUserOnline = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile || !profile.lastActiveAt) return false;

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return profile.lastActiveAt > fiveMinutesAgo;
  },
});

// Get online status for multiple users
export const getOnlineStatuses = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const statuses: Record<string, boolean> = {};

    for (const userId of args.userIds) {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      statuses[userId] = profile?.lastActiveAt 
        ? profile.lastActiveAt > fiveMinutesAgo 
        : false;
    }

    return statuses;
  },
});
