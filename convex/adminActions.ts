import { mutation, type MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

function isPlaceholderProfileName(name: string) {
  return name.trim().toLowerCase() === "user";
}

async function deleteDocs(
  ctx: MutationCtx,
  docs: Array<{ _id: Id<any> }>,
) {
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteUserEverywhere(ctx: MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (profile) {
    await ctx.db.delete(profile._id);
  }

  await deleteDocs(
    ctx,
    await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("milestones")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("feedback")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("achievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("skillsLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("experiencesLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("userMiniArcs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("savedResumes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    (await ctx.db.query("generatedResumesCache").collect()).filter(
      (doc) => doc.userId === userId,
    ),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("arcConnectProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    [
      ...(await ctx.db
        .query("arcConnectInteractions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()),
      ...(await ctx.db.query("arcConnectInteractions").collect()).filter(
        (doc) => doc.targetUserId === userId,
      ),
    ].filter(
      (doc, index, docs) =>
        docs.findIndex((candidate) => candidate._id === doc._id) === index,
    ),
  );

  await deleteDocs(
    ctx,
    (await ctx.db.query("callInvitations").collect()).filter(
      (doc) => doc.callerId === userId || doc.receiverId === userId,
    ),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("userInventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    await ctx.db
      .query("purchaseHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
  );

  await deleteDocs(
    ctx,
    (await ctx.db.query("messages").collect()).filter(
      (doc) => doc.senderId === userId || doc.recipientId === userId,
    ),
  );

  await deleteDocs(
    ctx,
    (await ctx.db.query("matchRequests").collect()).filter(
      (doc) => doc.senderId === userId || doc.recipientId === userId,
    ),
  );

  await ctx.db.delete(userId);
}

// Delete all users with the placeholder name "User" / "user"
export const deleteUsersNamedUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userProfiles = (await ctx.db.query("userProfiles").collect()).filter((profile) =>
      isPlaceholderProfileName(profile.name),
    );

    console.log(`Found ${userProfiles.length} placeholder users named "User/user"`);

    let deletedCount = 0;
    
    for (const profile of userProfiles) {
      try {
        const userIdTyped = profile.userId as Id<"users">;

        await deleteUserEverywhere(ctx, userIdTyped);
        
        deletedCount++;
        console.log(`Deleted placeholder user and related data for userId: ${profile.userId}`);
      } catch (error) {
        console.error(`Error deleting user ${profile.userId}:`, error);
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedCount} placeholder users named "User/user" and their associated data`,
      deletedCount,
    };
  },
});

// Delete duplicate users with the same email (keep the oldest one)
export const deleteDuplicateEmailUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    
    // Group users by email
    const emailGroups = new Map<string, typeof allUsers>();
    
    for (const user of allUsers) {
      if (user.email) {
        const existing = emailGroups.get(user.email) || [];
        existing.push(user);
        emailGroups.set(user.email, existing);
      }
    }

    let deletedCount = 0;
    const duplicateEmails: string[] = [];

    // Find and delete duplicates (keep the oldest one)
    for (const [email, users] of emailGroups.entries()) {
      if (users.length > 1) {
        duplicateEmails.push(email);
        console.log(`Found ${users.length} users with email: ${email}`);
        
        // Sort by creation time (oldest first)
        users.sort((a, b) => a._creationTime - b._creationTime);
        
        // Keep the first (oldest), delete the rest
        const toDelete = users.slice(1);
        
        for (const user of toDelete) {
          try {
            console.log(`Deleting duplicate user: ${user._id} (${email})`);
            
            // Delete user profile
            const profile = await ctx.db
              .query("userProfiles")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .first();
            
            if (profile) {
              await ctx.db.delete(profile._id);
            }
            
            // Delete associated data
            const goals = await ctx.db
              .query("goals")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .collect();
            for (const goal of goals) {
              await ctx.db.delete(goal._id);
            }
            
            const tasks = await ctx.db
              .query("tasks")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .collect();
            for (const task of tasks) {
              await ctx.db.delete(task._id);
            }
            
            const milestones = await ctx.db
              .query("milestones")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .collect();
            for (const milestone of milestones) {
              await ctx.db.delete(milestone._id);
            }
            
            const streaks = await ctx.db
              .query("streaks")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .collect();
            for (const streak of streaks) {
              await ctx.db.delete(streak._id);
            }
            
            // Delete the user itself
            await ctx.db.delete(user._id);
            
            deletedCount++;
            console.log(`Deleted duplicate user: ${user._id}`);
          } catch (error) {
            console.error(`Error deleting duplicate user ${user._id}:`, error);
          }
        }
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedCount} duplicate users`,
      deletedCount,
      duplicateEmails,
    };
  },
});
