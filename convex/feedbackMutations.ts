import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Internal mutation to store feedback (called by the action in feedback.ts)
export const storeFeedback = internalMutation({
  args: {
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("feedback", {
      userId,
      feedback: args.feedback,
    });
  },
});

// Get all feedback compiled into one document
export const getAllFeedback = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all feedback entries
    const allFeedback = await ctx.db.query("feedback").collect();

    // Get user profiles for each feedback
    const feedbackWithUsers = await Promise.all(
      allFeedback.map(async (feedback) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", feedback.userId))
          .first();

        const user = await ctx.db.get(feedback.userId);

        return {
          id: feedback._id,
          feedback: feedback.feedback,
          userName: userProfile?.name || "Anonymous",
          userEmail: user?.email || "Not provided",
          submittedAt: feedback._creationTime,
        };
      })
    );

    // Sort by submission time (newest first)
    feedbackWithUsers.sort((a, b) => b.submittedAt - a.submittedAt);

    // Compile into a formatted document
    const compiledDocument = feedbackWithUsers
      .map((entry, index) => {
        const date = new Date(entry.submittedAt).toLocaleString();
        return `
═══════════════════════════════════════════════════════════════
FEEDBACK #${feedbackWithUsers.length - index}
═══════════════════════════════════════════════════════════════
Submitted: ${date}
User: ${entry.userName}
Email: ${entry.userEmail}
ID: ${entry.id}

${entry.feedback}
`;
      })
      .join('\n');

    const header = `
╔═══════════════════════════════════════════════════════════════╗
║                    ARC FEEDBACK COMPILATION                    ║
║                  Total Entries: ${feedbackWithUsers.length.toString().padStart(4, ' ')}                        ║
║              Generated: ${new Date().toLocaleString()}              ║
╚═══════════════════════════════════════════════════════════════╝
`;

    return {
      totalCount: feedbackWithUsers.length,
      compiledDocument: header + compiledDocument,
      entries: feedbackWithUsers,
    };
  },
});
