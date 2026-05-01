import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const WINDOW_MS = 60000; // 1 minute window
const MAX_REQUESTS = 30; // Groq free tier allows 30 RPM
const BACKOFF_SECONDS = 60; // Wait 1 minute after a 429

export const checkAndIncrement = mutation({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<{ allowed: boolean; waitSeconds: number }> => {
    const now = Date.now();
    
    // Get existing rate limit entry
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();
    
    // If in backoff period, deny
    if (existing && existing.backoffUntil > now) {
      const waitSeconds = Math.ceil((existing.backoffUntil - now) / 1000);
      console.log(`[RateLimit DB] Blocked - in backoff period, wait ${waitSeconds}s`);
      return { allowed: false, waitSeconds };
    }
    
    // If no entry or window expired, create/reset
    if (!existing || (now - existing.windowStart) >= WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          count: 1,
          windowStart: now,
          backoffUntil: 0,
        });
      } else {
        await ctx.db.insert("rateLimits", {
          identifier: args.identifier,
          count: 1,
          windowStart: now,
          backoffUntil: 0,
        });
      }
      console.log(`[RateLimit DB] Allowed - new window, count: 1/${MAX_REQUESTS}`);
      return { allowed: true, waitSeconds: 0 };
    }
    
    // Check if limit exceeded
    if (existing.count >= MAX_REQUESTS) {
      const waitSeconds = Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000);
      console.log(`[RateLimit DB] Blocked - limit exceeded (${existing.count}/${MAX_REQUESTS}), wait ${waitSeconds}s`);
      return { allowed: false, waitSeconds };
    }
    
    // Increment count
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
    });
    console.log(`[RateLimit DB] Allowed - count: ${existing.count + 1}/${MAX_REQUESTS}`);
    return { allowed: true, waitSeconds: 0 };
  },
});

export const recordBackoff = mutation({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const now = Date.now();
    const backoffUntil = now + (BACKOFF_SECONDS * 1000);
    
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        backoffUntil,
        count: 999, // Max out count too
      });
    } else {
      await ctx.db.insert("rateLimits", {
        identifier: args.identifier,
        count: 999,
        windowStart: now,
        backoffUntil,
      });
    }
    
    console.log(`[RateLimit DB] 429 received - backing off until ${new Date(backoffUntil).toISOString()}`);
  },
});

export const getStatus = query({
  args: {
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<{ canRequest: boolean; waitSeconds: number; count: number }> => {
    const now = Date.now();
    
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier", (q) => q.eq("identifier", args.identifier))
      .first();
    
    if (!existing) {
      return { canRequest: true, waitSeconds: 0, count: 0 };
    }
    
    // In backoff
    if (existing.backoffUntil > now) {
      return { 
        canRequest: false, 
        waitSeconds: Math.ceil((existing.backoffUntil - now) / 1000),
        count: existing.count 
      };
    }
    
    // Window expired
    if ((now - existing.windowStart) >= WINDOW_MS) {
      return { canRequest: true, waitSeconds: 0, count: 0 };
    }
    
    // Check count
    if (existing.count >= MAX_REQUESTS) {
      return { 
        canRequest: false, 
        waitSeconds: Math.ceil((existing.windowStart + WINDOW_MS - now) / 1000),
        count: existing.count 
      };
    }
    
    return { canRequest: true, waitSeconds: 0, count: existing.count };
  },
});
