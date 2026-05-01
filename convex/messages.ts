import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Send a message to another user
export const sendMessage = mutation({
  args: {
    recipientId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if users are matched
    const request1 = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", userId).eq("recipientId", args.recipientId)
      )
      .first();

    const request2 = await ctx.db
      .query("matchRequests")
      .withIndex("by_users", (q) => 
        q.eq("senderId", args.recipientId).eq("recipientId", userId)
      )
      .first();

    const isMatched = 
      (request1?.status === "accepted") || 
      (request2?.status === "accepted");

    if (!isMatched) {
      throw new Error("You must be matched with this user to send messages");
    }

    // Create the message
    const messageId = await ctx.db.insert("messages", {
      senderId: userId,
      recipientId: args.recipientId,
      content: args.content,
      read: false,
      createdAt: Date.now(),
    });

    return messageId;
  },
});

// Get conversation with a specific user
export const getConversation = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all messages between the two users
    const allMessages = await ctx.db.query("messages").collect();
    
    const conversation = allMessages.filter(
      (msg) =>
        (msg.senderId === userId && msg.recipientId === args.otherUserId) ||
        (msg.senderId === args.otherUserId && msg.recipientId === userId)
    );

    // Sort by creation time
    conversation.sort((a, b) => a.createdAt - b.createdAt);

    // Get sender names
    const messagesWithNames = await Promise.all(
      conversation.map(async (msg) => {
        const senderProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", msg.senderId))
          .first();

        return {
          ...msg,
          senderName: senderProfile?.name.split(' ')[0] || "User",
          isFromMe: msg.senderId === userId,
        };
      })
    );

    return messagesWithNames;
  },
});

// Get all conversations (list of users you've messaged with)
export const getConversations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all messages involving the current user
    const allMessages = await ctx.db.query("messages").collect();
    const myMessages = allMessages.filter(
      (msg) => msg.senderId === userId || msg.recipientId === userId
    );

    // Get unique user IDs
    const userIds = new Set<string>();
    myMessages.forEach((msg) => {
      const otherId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      userIds.add(otherId);
    });

    // Get user profiles and last message for each conversation
    const conversations = await Promise.all(
      Array.from(userIds).map(async (otherUserId) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", otherUserId))
          .first();

        // Get last message in this conversation
        const conversationMessages = myMessages.filter(
          (msg) =>
            (msg.senderId === userId && msg.recipientId === otherUserId) ||
            (msg.senderId === otherUserId && msg.recipientId === userId)
        );
        conversationMessages.sort((a, b) => b.createdAt - a.createdAt);
        const lastMessage = conversationMessages[0];

        // Count unread messages from this user
        const unreadCount = conversationMessages.filter(
          (msg) => msg.recipientId === userId && !msg.read
        ).length;

        return {
          userId: otherUserId as Id<"users">,
          name: profile?.name.split(' ')[0] || "User",
          lastMessage: lastMessage?.content || "",
          lastMessageTime: lastMessage?.createdAt || 0,
          unreadCount,
        };
      })
    );

    // Sort by last message time
    conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    return conversations;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all unread messages from the other user
    const allMessages = await ctx.db.query("messages").collect();
    const unreadMessages = allMessages.filter(
      (msg) =>
        msg.senderId === args.otherUserId &&
        msg.recipientId === userId &&
        !msg.read
    );

    // Mark them as read
    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { read: true });
    }
  },
});

// Get unread message count and latest sender info
export const getUnreadCount = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { count: 0, latestSender: null };

    const allMessages = await ctx.db.query("messages").collect();
    const unreadMessages = allMessages.filter(
      (msg) => msg.recipientId === userId && !msg.read
    );

    // Get the most recent unread message
    const sortedUnread = unreadMessages.sort((a, b) => b.createdAt - a.createdAt);
    const latestUnread = sortedUnread[0];

    if (!latestUnread) {
      return { count: 0, latestSender: null };
    }

    // Get sender profile
    const senderProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", latestUnread.senderId))
      .first();

    return {
      count: unreadMessages.length,
      latestSender: latestUnread.senderId,
      latestSenderName: senderProfile?.name.split(' ')[0] || "Someone",
    };
  },
});
