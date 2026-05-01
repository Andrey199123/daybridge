import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

const MATCH_REQUEST_COST = 10;

// Send a match request (costs 10 coins)
export const sendMatchRequest = mutation({
  args: {
    recipientId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has enough coins
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) throw new Error("User profile not found");

    const currentCoins = userProfile.coins || 0;
    if (currentCoins < MATCH_REQUEST_COST) {
      throw new Error(`Not enough care points. You need ${MATCH_REQUEST_COST} to send a match request.`);
    }

    // Check if request already exists
    const existingRequest = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", userId).eq("recipientId", args.recipientId)
      )
      .first();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        throw new Error("You already sent a match request to this user");
      }
      if (existingRequest.status === "accepted") {
        throw new Error("You are already matched with this user");
      }
      if (existingRequest.status === "declined") {
        throw new Error("Your previous match request was declined");
      }
    }

    // Check if recipient already sent a request to this user
    const reciprocalRequest = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", args.recipientId).eq("recipientId", userId)
      )
      .first();

    if (reciprocalRequest && reciprocalRequest.status === "pending") {
      // Auto-accept if both users want to match
      await ctx.db.patch(reciprocalRequest._id, {
        status: "accepted",
        respondedAt: Date.now(),
      });
      
      // Don't charge coins since they're accepting an existing request
      return {
        success: true,
        autoAccepted: true,
        message: "Match request automatically accepted!",
      };
    }

    // Deduct coins
    await ctx.db.patch(userProfile._id, {
      coins: currentCoins - MATCH_REQUEST_COST,
    });

    // Create match request
    const requestId = await ctx.db.insert("matchRequests", {
      senderId: userId,
      recipientId: args.recipientId,
      status: "pending",
      createdAt: Date.now(),
    });

    return {
      success: true,
      requestId,
      coinsRemaining: currentCoins - MATCH_REQUEST_COST,
    };
  },
});

// Accept a match request
export const acceptMatchRequest = mutation({
  args: {
    requestId: v.id("matchRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Match request not found");

    if (request.recipientId !== userId) {
      throw new Error("You can only accept requests sent to you");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been responded to");
    }

    await ctx.db.patch(args.requestId, {
      status: "accepted",
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});

// Decline a match request
export const declineMatchRequest = mutation({
  args: {
    requestId: v.id("matchRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Match request not found");

    if (request.recipientId !== userId) {
      throw new Error("You can only decline requests sent to you");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been responded to");
    }

    await ctx.db.patch(args.requestId, {
      status: "declined",
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get pending match requests received by the user
export const getPendingRequests = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("matchRequests")
      .withIndex("by_recipient_status", (q) => 
        q.eq("recipientId", userId).eq("status", "pending")
      )
      .collect();

    // Get sender profiles
    const requestsWithProfiles = await Promise.all(
      requests.map(async (request) => {
        const senderProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", request.senderId))
          .first();

        return {
          ...request,
          senderName: senderProfile?.name || "Unknown User",
          senderGrade: senderProfile?.grade,
          senderState: senderProfile?.state,
        };
      })
    );

    return requestsWithProfiles;
  },
});

// Check if two users are matched (have accepted match request)
export const areUsersMatched = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    // Check both directions
    const request1 = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", userId).eq("recipientId", args.otherUserId)
      )
      .first();

    if (request1?.status === "accepted") return true;

    const request2 = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", args.otherUserId).eq("recipientId", userId)
      )
      .first();

    return request2?.status === "accepted";
  },
});

// Get match request status with another user
export const getMatchRequestStatus = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if current user sent a request
    const sentRequest = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", userId).eq("recipientId", args.otherUserId)
      )
      .first();

    if (sentRequest) {
      return {
        type: "sent",
        status: sentRequest.status,
        requestId: sentRequest._id,
      };
    }

    // Check if other user sent a request
    const receivedRequest = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", args.otherUserId).eq("recipientId", userId)
      )
      .first();

    if (receivedRequest) {
      return {
        type: "received",
        status: receivedRequest.status,
        requestId: receivedRequest._id,
      };
    }

    return null;
  },
});

// Get total match count for a user
export const getMatchCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all accepted requests where user is sender or recipient
    const allRequests = await ctx.db.query("matchRequests").collect();
    
    const matchCount = allRequests.filter(
      (req) => 
        req.status === "accepted" && 
        (req.senderId === args.userId || req.recipientId === args.userId)
    ).length;

    return matchCount;
  },
});

// Get current user's match count
export const getMyMatchCount = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const allRequests = await ctx.db.query("matchRequests").collect();
    
    const matchCount = allRequests.filter(
      (req) => 
        req.status === "accepted" && 
        (req.senderId === userId || req.recipientId === userId)
    ).length;

    return matchCount;
  },
});

// Get all accepted matches for current user with user details
export const getAcceptedMatches = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all accepted match requests where user is involved
    const allRequests = await ctx.db.query("matchRequests").collect();
    
    const acceptedRequests = allRequests.filter(
      (req) => 
        req.status === "accepted" && 
        (req.senderId === userId || req.recipientId === userId)
    );

    // Get user details for each match
    const matches = await Promise.all(
      acceptedRequests.map(async (request) => {
        const matchedUserId = request.senderId === userId ? request.recipientId : request.senderId;
        
        const user = await ctx.db.get(matchedUserId);
        if (!user) return null;

        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", matchedUserId))
          .first();

        const arcConnectProfile = await ctx.db
          .query("arcConnectProfiles")
          .withIndex("by_user", (q) => q.eq("userId", matchedUserId))
          .first();

        return {
          userId: matchedUserId,
          name: user.name || "Anonymous",
          email: arcConnectProfile?.shareEmail ? user.email : undefined,
          linkedInUrl: arcConnectProfile?.shareLinkedIn ? arcConnectProfile.linkedInUrl : undefined,
          bio: arcConnectProfile?.bio,
          grade: profile?.grade,
          state: profile?.state,
          lookingFor: arcConnectProfile?.lookingFor || [],
          matchedAt: request.respondedAt || request.createdAt,
        };
      })
    );

    // Filter out null values and sort by most recent
    return matches
      .filter((m) => m !== null)
      .sort((a, b) => (b?.matchedAt || 0) - (a?.matchedAt || 0));
  },
});
