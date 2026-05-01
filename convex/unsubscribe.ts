import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store unsubscribed emails
export const unsubscribe = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already unsubscribed
    const existing = await ctx.db
      .query("unsubscribes")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      return { success: true, alreadyUnsubscribed: true };
    }
    
    // Add to unsubscribe list
    await ctx.db.insert("unsubscribes", {
      email: args.email,
      unsubscribedAt: Date.now(),
    });
    
    return { success: true, alreadyUnsubscribed: false };
  },
});

// Check if email is unsubscribed
export const isUnsubscribed = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const unsubscribe = await ctx.db
      .query("unsubscribes")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    return !!unsubscribe;
  },
});

// Get all unsubscribed emails (admin only)
export const getAllUnsubscribes = query({
  handler: async (ctx) => {
    return await ctx.db.query("unsubscribes").collect();
  },
});
