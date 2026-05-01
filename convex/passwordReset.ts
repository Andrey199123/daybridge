import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Store reset token in database
export const storeResetToken = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing tokens for this user
    const existingTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    
    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    // Create new token
    return await ctx.db.insert("passwordResetTokens", {
      userId: args.userId,
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
      used: false,
    });
  },
});

// Verify reset token
export const verifyResetToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenRecord) {
      return { valid: false, reason: "invalid" as const };
    }

    if (tokenRecord.used) {
      return { valid: false, reason: "used" as const };
    }

    if (tokenRecord.expiresAt < Date.now()) {
      return { valid: false, reason: "expired" as const };
    }

    return { valid: true, userId: tokenRecord.userId, email: tokenRecord.email };
  },
});

// Mark token as used
export const markTokenAsUsed = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenRecord) {
      throw new Error("Invalid reset token");
    }

    await ctx.db.patch(tokenRecord._id, { used: true });
  },
});

// Internal mutation to update password (called from action)
export const updatePassword = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    // Find and delete the old password auth account
    const oldAuthAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .collect();

    for (const account of oldAuthAccounts) {
      await ctx.db.delete(account._id);
    }
    
    // Create new password account with new hashed password
    await ctx.db.insert("authAccounts", {
      userId: args.userId,
      provider: "password",
      providerAccountId: args.email,
      secret: args.hashedPassword,
    });

    console.log(`Password updated for user ${args.userId}`);
  },
});
