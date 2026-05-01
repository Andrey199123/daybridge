import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Track when an email is opened
export const trackEmailOpen = mutation({
  args: {
    emailId: v.string(),
    recipientEmail: v.string(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Log the email open event
    await ctx.db.insert("emailTracking", {
      emailId: args.emailId,
      recipientEmail: args.recipientEmail,
      openedAt: Date.now(),
      userAgent: args.userAgent,
      ipAddress: args.ipAddress,
    });

    return { success: true };
  },
});

// Get all tracking events
export const getAllTrackingEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("emailTracking")
      .order("desc")
      .collect();
    
    return events;
  },
});

// Get tracking events for a specific email
export const getTrackingByEmail = query({
  args: {
    recipientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("emailTracking")
      .filter((q) => q.eq(q.field("recipientEmail"), args.recipientEmail))
      .order("desc")
      .collect();
    
    return events;
  },
});

// Get summary statistics
export const getTrackingSummary = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("emailTracking").collect();
    
    // Group by recipient
    const byRecipient: Record<string, number> = {};
    events.forEach((event) => {
      byRecipient[event.recipientEmail] = (byRecipient[event.recipientEmail] || 0) + 1;
    });
    
    return {
      totalOpens: events.length,
      uniqueRecipients: Object.keys(byRecipient).length,
      byRecipient,
      recentEvents: events.slice(0, 10),
    };
  },
});

// Clear all tracking data (admin only)
export const clearAllTracking = mutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query("emailTracking").collect();
    
    // Delete all tracking events
    for (const event of events) {
      await ctx.db.delete(event._id);
    }
    
    return { deleted: events.length };
  },
});
