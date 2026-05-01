import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const DAILY_API_URL = "https://api.daily.co/v1";

// Fetch actual usage from Daily.co API
export const fetchDailyUsage = action({
  handler: async (ctx): Promise<any> => {
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      console.error("DAILY_API_KEY not configured");
      return null;
    }

    try {
      // Get current month's date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Format dates as YYYY-MM-DD
      const from = startOfMonth.toISOString().split('T')[0];
      const to = endOfMonth.toISOString().split('T')[0];

      // Fetch usage from Daily.co API - they use different endpoint
      // Daily.co analytics endpoint: GET /analytics/meetings
      const response = await fetch(
        `${DAILY_API_URL}/analytics/meetings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Daily.co usage API error:", error);
        
        // If analytics endpoint doesn't work, try to get room list as fallback
        const roomsResponse = await fetch(`${DAILY_API_URL}/rooms`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          console.log("📞 Daily.co Account Status:");
          console.log(`   Active Rooms: ${roomsData.data?.length || 0}`);
          console.log(`   Note: Usage analytics require a paid plan or may not be available yet`);
          
          // Use local tracking instead
          const localUsage: any = await ctx.runQuery(api.audioCalls.getMonthlyUsage);
          if (localUsage) {
            const usageData: any = {
              participantMinutes: localUsage.participantMinutes,
              freeLimit: 10000,
              percentUsed: localUsage.percentUsed,
              isNearLimit: localUsage.isNearLimit,
              isOverLimit: localUsage.isOverLimit,
              lastChecked: Date.now(),
              from,
              to,
            };

            console.log("📞 Daily.co Usage Report (Local Tracking):");
            console.log(`   Participant-Minutes: ${usageData.participantMinutes} / ${usageData.freeLimit}`);
            console.log(`   Percentage Used: ${usageData.percentUsed.toFixed(1)}%`);
            console.log(`   Status: ${usageData.isOverLimit ? '⚠️ OVER LIMIT' : usageData.isNearLimit ? '⚠️ NEAR LIMIT' : '✅ OK'}`);
            console.log(`   Period: ${from} to ${to}`);
            console.log(`   Note: Based on local call tracking`);

            await ctx.runMutation(api.audioCalls.storeDailyUsage, usageData);
            return usageData;
          }
        }
        
        return null;
      }

      const data = await response.json();
      
      // Calculate participant minutes from analytics data
      // This structure may vary based on Daily.co's actual response
      const participantMinutes = data.participant_minutes || 0;
      const freeLimit = 10000;
      const percentUsed = (participantMinutes / freeLimit) * 100;

      const usageData = {
        participantMinutes,
        freeLimit,
        percentUsed: Math.min(percentUsed, 100),
        isNearLimit: percentUsed >= 80,
        isOverLimit: participantMinutes > freeLimit,
        lastChecked: Date.now(),
        from,
        to,
      };

      console.log("📞 Daily.co Usage Report:");
      console.log(`   Participant-Minutes: ${participantMinutes} / ${freeLimit}`);
      console.log(`   Percentage Used: ${percentUsed.toFixed(1)}%`);
      console.log(`   Status: ${usageData.isOverLimit ? '⚠️ OVER LIMIT' : usageData.isNearLimit ? '⚠️ NEAR LIMIT' : '✅ OK'}`);
      console.log(`   Period: ${from} to ${to}`);

      // Store in database for historical tracking
      await ctx.runMutation(api.audioCalls.storeDailyUsage, usageData);

      return usageData;
    } catch (error) {
      console.error("Failed to fetch Daily.co usage:", error);
      
      // Fallback to local tracking
      const localUsage: any = await ctx.runQuery(api.audioCalls.getMonthlyUsage);
      if (localUsage) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const from = startOfMonth.toISOString().split('T')[0];
        const to = endOfMonth.toISOString().split('T')[0];
        
        const usageData: any = {
          participantMinutes: localUsage.participantMinutes,
          freeLimit: 10000,
          percentUsed: localUsage.percentUsed,
          isNearLimit: localUsage.isNearLimit,
          isOverLimit: localUsage.isOverLimit,
          lastChecked: Date.now(),
          from,
          to,
        };

        console.log("📞 Daily.co Usage Report (Local Tracking - API Error):");
        console.log(`   Participant-Minutes: ${usageData.participantMinutes} / ${usageData.freeLimit}`);
        console.log(`   Percentage Used: ${usageData.percentUsed.toFixed(1)}%`);
        console.log(`   Status: ${usageData.isOverLimit ? '⚠️ OVER LIMIT' : usageData.isNearLimit ? '⚠️ NEAR LIMIT' : '✅ OK'}`);
        console.log(`   Period: ${from} to ${to}`);

        await ctx.runMutation(api.audioCalls.storeDailyUsage, usageData);
        return usageData;
      }
      
      return null;
    }
  },
});

// Create a Daily.co room for a call
export const createRoom = action({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Calls are now free - no coin cost
    const userProfile = await ctx.runQuery(api.users.getCurrentUser);
    if (!userProfile?.profile) throw new Error("Profile not found");

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      throw new Error("DAILY_API_KEY not configured");
    }

    // Create a unique room name
    const roomName = `arc-call-${userId}-${args.targetUserId}-${Date.now()}`;

    // Create room via Daily.co API
    const response = await fetch(`${DAILY_API_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          max_participants: 2,
          enable_chat: false,
          enable_screenshare: false,
          start_video_off: true, // Audio only
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Daily.co API error:", error);
      throw new Error("Failed to create call room");
    }

    const room = await response.json();

    // Create meeting tokens for both participants
    const callerToken = await createMeetingToken(apiKey, roomName, userId);
    const receiverToken = await createMeetingToken(apiKey, roomName, args.targetUserId);

    // Store the call invitation
    await ctx.runMutation(api.audioCalls.createCallInvitation, {
      callerId: userId,
      receiverId: args.targetUserId,
      roomName: room.name,
      roomUrl: room.url,
      callerToken,
      receiverToken,
    });

    return {
      roomUrl: room.url,
      roomName: room.name,
      token: callerToken,
      coinsCost: 0, // Calls are free
    };
  },
});

// Helper to create meeting token
async function createMeetingToken(apiKey: string, roomName: string, visitorId: string): Promise<string> {
  const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: visitorId,
        enable_screenshare: false,
        start_video_off: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create meeting token");
  }

  const data = await response.json();
  return data.token;
}

import { api } from "./_generated/api";

// Store call invitation in database
export const createCallInvitation = mutation({
  args: {
    callerId: v.string(),
    receiverId: v.id("users"),
    roomName: v.string(),
    roomUrl: v.string(),
    callerToken: v.string(),
    receiverToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for existing pending call
    const existing = await ctx.db
      .query("callInvitations")
      .withIndex("by_receiver_status", (q) => 
        q.eq("receiverId", args.receiverId).eq("status", "pending")
      )
      .first();

    if (existing) {
      // Cancel the old one
      await ctx.db.patch(existing._id, { status: "cancelled" });
    }

    return await ctx.db.insert("callInvitations", {
      callerId: args.callerId,
      receiverId: args.receiverId,
      roomName: args.roomName,
      roomUrl: args.roomUrl,
      callerToken: args.callerToken,
      receiverToken: args.receiverToken,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Get pending call invitations for current user
export const getPendingInvitations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invitations = await ctx.db
      .query("callInvitations")
      .withIndex("by_receiver_status", (q) => 
        q.eq("receiverId", userId).eq("status", "pending")
      )
      .collect();

    // Get caller info for each invitation
    const withCallerInfo = await Promise.all(
      invitations.map(async (inv) => {
        const callerProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", inv.callerId))
          .first();

        return {
          ...inv,
          callerName: callerProfile?.name?.split(' ')[0] || "Someone",
        };
      })
    );

    return withCallerInfo;
  },
});

// Get active call for current user (as caller)
export const getActiveCall = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if user is in an active call as caller
    const asCallerCall = await ctx.db
      .query("callInvitations")
      .withIndex("by_caller_status", (q) => 
        q.eq("callerId", userId).eq("status", "active")
      )
      .first();

    if (asCallerCall) {
      return { ...asCallerCall, token: asCallerCall.callerToken, role: "caller" };
    }

    // Check if user is in an active call as receiver
    const asReceiverCall = await ctx.db
      .query("callInvitations")
      .withIndex("by_receiver_status", (q) => 
        q.eq("receiverId", userId).eq("status", "active")
      )
      .first();

    if (asReceiverCall) {
      return { ...asReceiverCall, token: asReceiverCall.receiverToken, role: "receiver" };
    }

    return null;
  },
});

// Accept a call invitation
export const acceptCall = mutation({
  args: {
    invitationId: v.id("callInvitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.receiverId !== userId) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer pending");
    }

    await ctx.db.patch(args.invitationId, { 
      status: "active",
      startedAt: Date.now(),
    });

    return {
      roomUrl: invitation.roomUrl,
      token: invitation.receiverToken,
    };
  },
});

// Decline a call invitation
export const declineCall = mutation({
  args: {
    invitationId: v.id("callInvitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.receiverId !== userId) {
      throw new Error("Invitation not found");
    }

    await ctx.db.patch(args.invitationId, { status: "declined" });
  },
});

// End a call
export const endCall = mutation({
  args: {
    invitationId: v.id("callInvitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Call not found");
    }

    // Only caller or receiver can end the call
    if (invitation.callerId !== userId && invitation.receiverId !== userId) {
      throw new Error("Not authorized to end this call");
    }

    const endedAt = Date.now();
    const durationSeconds = invitation.startedAt 
      ? Math.floor((endedAt - invitation.startedAt) / 1000)
      : 0;

    await ctx.db.patch(args.invitationId, { 
      status: "ended",
      endedAt,
      durationSeconds,
    });
  },
});

// Cancel outgoing call (before it's answered)
export const cancelCall = mutation({
  args: {
    invitationId: v.id("callInvitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.callerId !== userId) {
      throw new Error("Call not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Call is no longer pending");
    }

    await ctx.db.patch(args.invitationId, { status: "cancelled" });
  },
});

// Get outgoing pending call
export const getOutgoingCall = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const call = await ctx.db
      .query("callInvitations")
      .withIndex("by_caller_status", (q) => 
        q.eq("callerId", userId).eq("status", "pending")
      )
      .first();

    if (!call) return null;

    // Get receiver info
    const receiverProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", call.receiverId))
      .first();

    return {
      ...call,
      receiverName: receiverProfile?.name?.split(' ')[0] || "User",
    };
  },
});

// Get monthly usage statistics
export const getMonthlyUsage = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const now = Date.now();
    const startOfMonth = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);

    // Get all ended calls this month where user was caller or receiver
    const allCalls = await ctx.db
      .query("callInvitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "ended"),
          q.gte(q.field("createdAt"), startOfMonth),
          q.or(
            q.eq(q.field("callerId"), userId),
            q.eq(q.field("receiverId"), userId)
          )
        )
      )
      .collect();

    // Calculate participant-minutes (2 participants per call)
    const totalSeconds = allCalls.reduce((sum, call) => sum + (call.durationSeconds || 0), 0);
    const participantMinutes = Math.ceil((totalSeconds / 60) * 2); // 2 participants per call
    const freeLimit = 10000;
    const percentUsed = (participantMinutes / freeLimit) * 100;

    return {
      participantMinutes,
      freeLimit,
      percentUsed: Math.min(percentUsed, 100),
      callCount: allCalls.length,
      totalMinutes: Math.ceil(totalSeconds / 60),
      isNearLimit: percentUsed >= 80,
      isOverLimit: participantMinutes > freeLimit,
    };
  },
});

// Store Daily.co usage data
export const storeDailyUsage = mutation({
  args: {
    participantMinutes: v.number(),
    freeLimit: v.number(),
    percentUsed: v.number(),
    isNearLimit: v.boolean(),
    isOverLimit: v.boolean(),
    lastChecked: v.number(),
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    // Store the usage snapshot
    await ctx.db.insert("dailyUsage", args);
  },
});

// Get latest Daily.co usage from database
export const getLatestDailyUsage = query({
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("dailyUsage")
      .withIndex("by_lastChecked")
      .order("desc")
      .first();

    return latest;
  },
});

// Get Daily.co usage (returns latest from database)
export const getDailyUsageWithRefresh = query({
  handler: async (ctx) => {
    const latest = await ctx.db
      .query("dailyUsage")
      .withIndex("by_lastChecked")
      .order("desc")
      .first();

    return latest;
  },
});
