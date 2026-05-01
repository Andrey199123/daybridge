import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Save AI chat interaction
export const saveChatHistory = mutation({
  args: {
    userId: v.id("users"),
    endpoint: v.string(),
    userMessage: v.string(),
    aiResponse: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiChatHistory", {
      userId: args.userId,
      endpoint: args.endpoint,
      userMessage: args.userMessage,
      aiResponse: args.aiResponse,
      timestamp: Date.now(),
      metadata: args.metadata,
    });
  },
});

// Get chat history for a specific user
export const getUserChatHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const history = await ctx.db
      .query("aiChatHistory")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    
    return history;
  },
});

// Admin: Get all chat history
export const getAllChatHistory = query({
  handler: async (ctx) => {
    const history = await ctx.db
      .query("aiChatHistory")
      .order("desc")
      .take(1000); // Limit to last 1000 chats
    
    return history;
  },
});

// Admin: Get chat history for specific user
export const getAdminUserChatHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("aiChatHistory")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    return history;
  },
});
