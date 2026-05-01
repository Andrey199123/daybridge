import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get or create Care Circle profile for current user
export const getMyProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return profile;
  },
});

// Enable/setup Care Circle profile
export const setupProfile = mutation({
  args: {
    enabled: v.boolean(),
    visibility: v.string(),
    shareEmail: v.boolean(),
    shareLinkedIn: v.boolean(),
    shareSocials: v.boolean(),
    linkedInUrl: v.optional(v.string()),
    socialLinks: v.optional(v.array(v.object({
      platform: v.string(),
      url: v.string(),
    }))),
    bio: v.optional(v.string()),
    lookingFor: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, args);
    }

    return await ctx.db.insert("arcConnectProfiles", {
      userId,
      ...args,
      blockedUsers: [],
      skippedUsers: [],
    });
  },
});

// Update Care Circle profile
export const updateProfile = mutation({
  args: {
    enabled: v.optional(v.boolean()),
    visibility: v.optional(v.string()),
    shareEmail: v.optional(v.boolean()),
    shareLinkedIn: v.optional(v.boolean()),
    shareSocials: v.optional(v.boolean()),
    linkedInUrl: v.optional(v.string()),
    socialLinks: v.optional(v.array(v.object({
      platform: v.string(),
      url: v.string(),
    }))),
    bio: v.optional(v.string()),
    lookingFor: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found. Please set up Care Circle first.");
    }

    return await ctx.db.patch(profile._id, {
      ...(args.enabled !== undefined && { enabled: args.enabled }),
      ...(args.visibility !== undefined && { visibility: args.visibility }),
      ...(args.shareEmail !== undefined && { shareEmail: args.shareEmail }),
      ...(args.shareLinkedIn !== undefined && { shareLinkedIn: args.shareLinkedIn }),
      ...(args.shareSocials !== undefined && { shareSocials: args.shareSocials }),
      ...(args.linkedInUrl !== undefined && { linkedInUrl: args.linkedInUrl }),
      ...(args.socialLinks !== undefined && { socialLinks: args.socialLinks }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(args.lookingFor !== undefined && { lookingFor: args.lookingFor }),
    });
  },
});

// Get potential matches for current user
export const getMatches = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get current user's Care Circle profile
    const myConnectProfile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!myConnectProfile || !myConnectProfile.enabled) {
      return [];
    }

    // Get current user's main profile
    const myProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!myProfile) return [];

    // Get my goals
    const myGoals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get my completed mini-arcs
    const myMiniArcs = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get all enabled ArcConnect profiles (excluding self, blocked, and skipped)
    const blockedIds = myConnectProfile.blockedUsers || [];
    const skippedIds = myConnectProfile.skippedUsers || [];
    const excludeIds = [userId, ...blockedIds, ...skippedIds];

    const allConnectProfiles = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    const eligibleProfiles = allConnectProfiles.filter(
      p => !excludeIds.includes(p.userId) && 
           (p.visibility === "public" || p.visibility === "matches_only")
    );

    // Score and rank matches
    const matches = await Promise.all(
      eligibleProfiles.map(async (connectProfile) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", connectProfile.userId))
          .first();

        if (!userProfile) return null;

        // Get their goals
        const theirGoals = await ctx.db
          .query("goals")
          .withIndex("by_user", (q) => q.eq("userId", connectProfile.userId))
          .collect();

        // Get their mini-arcs
        const theirMiniArcs = await ctx.db
          .query("userMiniArcs")
          .withIndex("by_user", (q) => q.eq("userId", connectProfile.userId))
          .collect();

        // Calculate match score
        let score = 0;
        const matchReasons: string[] = [];

        // 1. Similar goals (same category or similar titles)
        const myGoalCategories = new Set(myGoals.map(g => g.category));
        const theirGoalCategories = new Set(theirGoals.map(g => g.category));
        const sharedCategories = [...myGoalCategories].filter(c => theirGoalCategories.has(c));
        if (sharedCategories.length > 0) {
          score += sharedCategories.length * 20;
          matchReasons.push(`Both pursuing ${sharedCategories[0].replace('_', ' ')} goals`);
        }

        // 2. Complementary skills (one has what other wants)
        const mySkills = new Set(myProfile.skills || []);
        const theirSkills = new Set(userProfile.skills || []);
        const theyHaveWhatINeed = [...theirSkills].filter(s => !mySkills.has(s));
        const iHaveWhatTheyNeed = [...mySkills].filter(s => !theirSkills.has(s));
        if (theyHaveWhatINeed.length > 0 && iHaveWhatTheyNeed.length > 0) {
          score += 30;
          matchReasons.push("Complementary skills");
        }

        // 3. Similar interests
        const myInterests = new Set(myProfile.interests || []);
        const theirInterests = new Set(userProfile.interests || []);
        const sharedInterests = [...myInterests].filter(i => theirInterests.has(i));
        if (sharedInterests.length > 0) {
          score += sharedInterests.length * 10;
          if (sharedInterests.length >= 2) {
            matchReasons.push(`Shared interests in ${sharedInterests.slice(0, 2).join(" and ")}`);
          }
        }

        // 4. Similar daily rhythm
        if (myProfile.grade && userProfile.grade && myProfile.grade === userProfile.grade) {
          score += 15;
          matchReasons.push("Similar daily rhythm");
        }

        // 5. Similar motivation level
        if (myProfile.motivationLevel && userProfile.motivationLevel && 
            myProfile.motivationLevel === userProfile.motivationLevel) {
          score += 10;
        }

        // 6. Similar quick-routine paths
        const myArcTemplates = new Set(myMiniArcs.map(a => a.templateId.toString()));
        const theirArcTemplates = new Set(theirMiniArcs.map(a => a.templateId.toString()));
        const sharedArcs = [...myArcTemplates].filter(t => theirArcTemplates.has(t));
        if (sharedArcs.length > 0) {
          score += sharedArcs.length * 15;
          matchReasons.push("Similar support routines");
        }

        // 7. Looking for same things
        const myLookingFor = new Set(myConnectProfile.lookingFor || []);
        const theirLookingFor = new Set(connectProfile.lookingFor || []);
        const sharedLookingFor = [...myLookingFor].filter(l => theirLookingFor.has(l));
        if (sharedLookingFor.length > 0) {
          score += 20;
        }

        // Only return if score is above threshold
        if (score < 20) return null;

        return {
          id: connectProfile._id,
          userId: connectProfile.userId,
          name: userProfile.name.split(' ')[0], // First name only
          grade: userProfile.grade,
          state: userProfile.state,
          bio: connectProfile.bio,
          interests: userProfile.interests?.slice(0, 3) || [],
          skills: (userProfile.skills || []).slice(0, 5),
          goals: theirGoals.slice(0, 2).map(g => g.title),
          matchScore: score,
          matchReasons: matchReasons.slice(0, 2),
          shareEmail: connectProfile.shareEmail,
          email: connectProfile.shareEmail ? (await ctx.db.get(connectProfile.userId))?.email : undefined,
          shareLinkedIn: connectProfile.shareLinkedIn,
          linkedInUrl: connectProfile.linkedInUrl,
          shareSocials: connectProfile.shareSocials,
          socialLinks: connectProfile.socialLinks,
        };
      })
    );

    // Filter nulls and sort by score
    return matches
      .filter(Boolean)
      .sort((a, b) => (b?.matchScore || 0) - (a?.matchScore || 0))
      .slice(0, 20);
  },
});

// Get full profile of a match (if they allow it)
export const getMatchProfile = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Check if current user has ArcConnect enabled
    const myProfile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!myProfile || !myProfile.enabled) {
      return null;
    }

    // Get target's ArcConnect profile
    const targetConnectProfile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetConnectProfile || !targetConnectProfile.enabled) {
      return null;
    }

    // Check if target has blocked current user
    if (targetConnectProfile.blockedUsers?.includes(userId)) {
      return null;
    }

    // Get target's main profile
    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    if (!targetProfile) return null;

    // Get their goals
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .collect();

    // Get their completed mini-arcs
    const miniArcs = await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user_status", (q) => q.eq("userId", args.targetUserId).eq("status", "completed"))
      .collect();

    // Note: View logging moved to a separate mutation to avoid query write restrictions

    return {
      name: targetProfile.name.split(' ')[0],
      grade: targetProfile.grade,
      state: targetProfile.state,
      schoolName: targetProfile.schoolName,
      bio: targetConnectProfile.bio,
      interests: targetProfile.interests,
      skills: targetProfile.skills,
      goals: goals.map(g => ({ title: g.title, category: g.category, status: g.status })),
      miniArcsCompleted: miniArcs.length,
      lookingFor: targetConnectProfile.lookingFor,
      // Contact info based on sharing preferences
      email: targetConnectProfile.shareEmail ? (await ctx.db.get(args.targetUserId))?.email : undefined,
      linkedInUrl: targetConnectProfile.shareLinkedIn ? targetConnectProfile.linkedInUrl : undefined,
      socialLinks: targetConnectProfile.shareSocials ? targetConnectProfile.socialLinks : undefined,
    };
  },
});

// Skip a match (won't show again)
export const skipMatch = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Care Circle profile not found");

    const skippedUsers = profile.skippedUsers || [];
    if (!skippedUsers.includes(args.targetUserId)) {
      await ctx.db.patch(profile._id, {
        skippedUsers: [...skippedUsers, args.targetUserId],
      });
    }

    // Log interaction
    await ctx.db.insert("arcConnectInteractions", {
      userId,
      targetUserId: args.targetUserId,
      action: "skipped",
      createdAt: Date.now(),
    });
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Care Circle profile not found");

    const blockedUsers = profile.blockedUsers || [];
    if (!blockedUsers.includes(args.targetUserId)) {
      await ctx.db.patch(profile._id, {
        blockedUsers: [...blockedUsers, args.targetUserId],
      });
    }

    // Log interaction
    await ctx.db.insert("arcConnectInteractions", {
      userId,
      targetUserId: args.targetUserId,
      action: "blocked",
      createdAt: Date.now(),
    });
  },
});

// Report a user
export const reportUser = mutation({
  args: {
    targetUserId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Log the report
    await ctx.db.insert("arcConnectInteractions", {
      userId,
      targetUserId: args.targetUserId,
      action: "reported",
      createdAt: Date.now(),
    });

    // Also block the user
    const profile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      const blockedUsers = profile.blockedUsers || [];
      if (!blockedUsers.includes(args.targetUserId)) {
        await ctx.db.patch(profile._id, {
          blockedUsers: [...blockedUsers, args.targetUserId],
        });
      }
    }
  },
});

// Disable Care Circle (opt out)
export const disableArcConnect = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { enabled: false });
    }
  },
});
