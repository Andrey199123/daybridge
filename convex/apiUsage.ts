import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Track API usage for monitoring Cohere API calls
 */

// Track an API call
export const trackApiCall = mutation({
  args: {
    endpoint: v.string(), // "chat", "smartGoalChat", "generateTasks", etc.
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if we have a record for today
    const existing = await ctx.db
      .query("apiUsage")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();
    
    if (existing) {
      // Increment count - cast to any to allow dynamic fields
      const updates: any = {
        totalCalls: existing.totalCalls + 1,
      };
      updates[args.endpoint] = ((existing as any)[args.endpoint] || 0) + 1;
      
      await ctx.db.patch(existing._id, updates);
    } else {
      // Create new record for today
      const newRecord: any = {
        date: today,
        totalCalls: 1,
      };
      newRecord[args.endpoint] = 1;
      
      await ctx.db.insert("apiUsage", newRecord);
    }
  },
});

// Get usage stats
export const getUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const allRecords = await ctx.db.query("apiUsage").collect();
    
    // Calculate totals
    const totalCalls = allRecords.reduce((sum, record) => sum + record.totalCalls, 0);
    
    // Get current month's usage
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthRecords = allRecords.filter(record => record.date.startsWith(currentMonth));
    const monthCalls = monthRecords.reduce((sum, record) => sum + record.totalCalls, 0);
    
    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = allRecords.find(record => record.date === today);
    const todayCalls = todayRecord?.totalCalls || 0;
    
    // Get last 7 days
    const last7Days = allRecords
      .filter(record => {
        const recordDate = new Date(record.date);
        const daysAgo = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysAgo < 7;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return {
      totalCalls,
      monthCalls,
      todayCalls,
      remaining: Math.max(0, 1000 - monthCalls), // Free tier limit is 1000/month
      percentUsed: Math.round((monthCalls / 1000) * 100),
      last7Days: last7Days.map(record => ({
        date: record.date,
        calls: record.totalCalls,
      })),
    };
  },
});

// Get detailed breakdown by endpoint
export const getUsageBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const monthRecords = await ctx.db
      .query("apiUsage")
      .filter((q) => q.gte(q.field("date"), currentMonth))
      .collect();
    
    // Aggregate by endpoint
    const breakdown: Record<string, number> = {};
    
    for (const record of monthRecords) {
      for (const [key, value] of Object.entries(record)) {
        if (key !== '_id' && key !== '_creationTime' && key !== 'date' && key !== 'totalCalls') {
          breakdown[key] = (breakdown[key] || 0) + (value as number);
        }
      }
    }
    
    return breakdown;
  },
});


// Admin query to get all API usage
export const getAllApiUsage = query({
  handler: async (ctx) => {
    const usage = await ctx.db.query("apiUsage").collect();
    return usage;
  },
});
