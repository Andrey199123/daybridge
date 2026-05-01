import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  userProfiles: defineTable({
    userId: v.string(),
    name: v.string(),
    birthday: v.optional(v.string()),
    // Accept existing numeric grades AND new string grades (and null if you ever stored it)
    grade: v.union(v.string(), v.float64(), v.null()),
    interests: v.array(v.string()),
    growthFocus: v.optional(v.string()),
    bigGoal: v.optional(v.string()),
    coreSkills: v.optional(v.string()),
    motivationLevel: v.optional(v.string()),
    completedOnboarding: v.boolean(),
    completedTutorial: v.optional(v.boolean()), // Track if user has completed tutorial
    onboardingStep: v.optional(v.number()), // Track current step for resume
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalGoalsCompleted: v.number(),
    darkMode: v.boolean(),
    coins: v.optional(v.float64()),
    pictureUrl: v.optional(v.string()),
    points: v.optional(v.number()),
    availability: v.optional(v.string()),
    lastActiveAt: v.optional(v.number()), // Track last active timestamp for online status
    // New onboarding fields
    awards: v.optional(v.array(v.object({
      title: v.string(),
      issuer: v.optional(v.string()), // Make issuer optional for backward compatibility
      organization: v.optional(v.string()), // Add organization field that might exist
      monthYear: v.optional(v.string()), // Make monthYear optional too
      description: v.optional(v.string()),
    }))),
    programs: v.optional(v.array(v.object({
      title: v.string(),
      organization: v.optional(v.string()), // Make organization optional for backward compatibility
      role: v.optional(v.string()),
      monthYear: v.optional(v.string()), // Make monthYear optional for backward compatibility
      description: v.optional(v.string()),
    }))),
    skills: v.optional(v.array(v.string())),
    resumeFileId: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    schoolCity: v.optional(v.string()),
    schoolState: v.optional(v.string()),
    familyIncomeRange: v.optional(v.string()),
    gender: v.optional(v.string()),
    raceEthnicity: v.optional(v.array(v.string())), // Changed to array for multi-select
    // User preferences
    preferences: v.optional(v.object({
      theme: v.optional(v.string()),
      motion: v.optional(v.string()),
      sound: v.optional(v.boolean()),
    })),
  }).index("by_user", ["userId"])
    .index("by_points", ["points"]),

  goals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    status: v.string(),
    priority: v.string(),
    targetDate: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    aiGenerated: v.boolean(),
    availabilityChatCompleted: v.optional(v.boolean()),
    completionDetails: v.optional(v.object({
      result: v.optional(v.string()),
      feedback: v.optional(v.string()),
      whatWentWell: v.optional(v.string()),
      whatCouldImprove: v.optional(v.string()),
      skillsGained: v.optional(v.array(v.string())),
    })),
  }).index("by_user", ["userId"])
      .index("by_user_status", ["userId", "status"])
      .index("by_category", ["category"])
      .searchIndex("by_title", {
        searchField: "title",
        filterFields: ["userId"],
      }),

  tasks: defineTable({
    goalId: v.id("goals"),
    milestoneId: v.optional(v.id("milestones")),
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    order: v.number(),
    completedAt: v.optional(v.number()),
    scheduledDate: v.optional(v.string()), // New field for scheduled date (e.g., "YYYY-MM-DD")
    scheduledTime: v.optional(v.string()), // New field for scheduled time (e.g., "HH:MM")
    durationMinutes: v.optional(v.number()), // Estimated duration in minutes
    skills: v.optional(v.array(v.string())), // Skills gained from this task
  }).index("by_goal", ["goalId"])
      .index("by_user", ["userId"])
      .index("by_milestone", ["milestoneId"]),

  streaks: defineTable({
    userId: v.id("users"),
    date: v.string(), // YYYY-MM-DD
    tasksCompleted: v.number(),
    goalsWorkedOn: v.array(v.id("goals")),
  }).index("by_user", ["userId"])
      .index("by_user_date", ["userId", "date"]),

  goalTemplates: defineTable({
    category: v.string(),
    title: v.string(),
    description: v.string(),
    suggestedTasks: v.array(v.string()),
    difficulty: v.string(),
    estimatedWeeks: v.number(),
  }).index("by_category", ["category"]),

  milestones: defineTable({
    goalId: v.id("goals"),
    userId: v.id("users"),
    title: v.string(),
    deadline: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    status: v.string(), // "active" | "completed"
    order: v.number(),
    tasksGenerated: v.optional(v.boolean()),
  }).index("by_goal", ["goalId"])
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    message: v.string(),
    read: v.boolean(),
  }).index("by_user", ["userId"]),

  posts: defineTable({
    title: v.string(),
    content: v.string(),
    author: v.string(),
    imageUrl: v.optional(v.string()),
  }),

  feedback: defineTable({
    userId: v.id("users"),
    feedback: v.string(),
  }).index("by_user", ["userId"]),

  // Rate limiting for API calls (persisted to survive action restarts)
  rateLimits: defineTable({
    identifier: v.string(), // e.g., "gemini-api"
    count: v.number(),
    windowStart: v.number(), // timestamp when window started
    backoffUntil: v.number(), // timestamp until which requests are blocked
  }).index("by_identifier", ["identifier"]),

  // Achievements tracking
  achievements: defineTable({
    userId: v.id("users"),
    type: v.string(), // "first_mission", "streak_7", "tasks_100", etc.
    title: v.string(),
    description: v.string(),
    icon: v.string(), // "award", "star", "zap", "trophy", etc.
    unlockedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  // Skills & Experience tracking (passive profile building)
  skillsLog: defineTable({
    userId: v.id("users"),
    skill: v.string(),
    source: v.string(), // "milestone" | "task" | "goal"
    sourceId: v.string(), // ID of the milestone/task/goal
    sourceTitle: v.string(), // Title for display
    category: v.string(), // Goal category
    earnedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_skill", ["userId", "skill"]),

  experiencesLog: defineTable({
    userId: v.id("users"),
    type: v.string(), // "project", "internship_search", "competition", "learning", etc.
    title: v.string(),
    description: v.string(),
    category: v.string(), // Goal category
    skills: v.array(v.string()), // Related skills
    goalId: v.id("goals"),
    completedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  // Mini-Arc templates (preset micro-goals)
  miniArcTemplates: defineTable({
    title: v.string(),
    summary: v.string(),
    tags: v.array(v.string()), // Communication, Digital Tools, Career Skills, etc.
    deliverable: v.string(), // Resume-ready output
    estimatedWeeks: v.number(), // 1-4 weeks
    skills: v.array(v.string()), // Skills this Mini-Arc develops
    weeklyTasks: v.array(v.object({
      week: v.number(),
      title: v.string(),
      description: v.string(),
      resources: v.array(v.object({
        title: v.string(),
        url: v.string(),
        type: v.string(), // "video", "article", "template", "tool"
      })),
    })),
    suggestedGoals: v.array(v.object({
      title: v.string(),
      description: v.string(),
      category: v.string(),
    })),
    targetGrades: v.optional(v.array(v.string())), // e.g., ["11th", "12th"] for college prep
    interestAreas: v.array(v.string()), // Matching interests from onboarding
  }).index("by_tags", ["tags"])
    .searchIndex("search_title", { searchField: "title" }),

  // User's active/completed Mini-Arcs
  userMiniArcs: defineTable({
    userId: v.id("users"),
    templateId: v.id("miniArcTemplates"),
    status: v.string(), // "active" | "completed" | "abandoned"
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    currentWeek: v.number(),
    completedTasks: v.array(v.number()), // Indices of completed tasks
    skippedGoalSuggestions: v.optional(v.boolean()),
  }).index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_template", ["templateId"]),

  // Saved resumes
  savedResumes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    intent: v.string(), // "internship" | "college" | "summer_program" | "general"
    template: v.string(), // "professional" | "minimalist" | "creative"
    sections: v.object({
      header: v.object({
        name: v.string(),
        email: v.optional(v.string()),
        location: v.optional(v.string()),
        school: v.optional(v.string()),
        grade: v.optional(v.string()),
      }),
      summary: v.optional(v.string()),
      education: v.optional(v.array(v.object({
        school: v.string(),
        location: v.optional(v.string()),
        grade: v.optional(v.string()),
        gpa: v.optional(v.string()),
      }))),
      experience: v.array(v.object({
        title: v.string(),
        description: v.string(),
        date: v.optional(v.string()),
        bullets: v.array(v.string()),
      })),
      skills: v.array(v.string()),
      achievements: v.optional(v.array(v.object({
        title: v.string(),
        issuer: v.optional(v.string()),
        date: v.optional(v.string()),
      }))),
      activities: v.optional(v.array(v.object({
        title: v.string(),
        role: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Generated resumes cache (AI-generated)
  generatedResumesCache: defineTable({
    userId: v.id("users"),
    intent: v.string(), // "internship" | "college" | "summer_program" | "general"
    template: v.string(), // "professional" | "minimalist" | "creative"
    includeEmail: v.boolean(),
    sections: v.object({
      header: v.object({
        name: v.string(),
        email: v.optional(v.string()),
        location: v.optional(v.string()),
        school: v.optional(v.string()),
        grade: v.optional(v.string()),
      }),
      summary: v.optional(v.string()),
      education: v.optional(v.array(v.object({
        school: v.string(),
        location: v.optional(v.string()),
        grade: v.optional(v.string()),
        gpa: v.optional(v.string()),
      }))),
      experience: v.array(v.object({
        title: v.string(),
        description: v.string(),
        date: v.optional(v.string()),
        bullets: v.array(v.string()),
      })),
      skills: v.array(v.string()),
      achievements: v.optional(v.array(v.object({
        title: v.string(),
        issuer: v.optional(v.string()),
        date: v.optional(v.string()),
      }))),
      activities: v.optional(v.array(v.object({
        title: v.string(),
        role: v.optional(v.string()),
        description: v.optional(v.string()),
      }))),
    }),
    generatedAt: v.number(),
  }).index("by_user_intent_template", ["userId", "intent", "template", "includeEmail"]),

  // ArcConnect user settings
  arcConnectProfiles: defineTable({
    userId: v.id("users"),
    enabled: v.boolean(), // Opt-in to ArcConnect
    visibility: v.string(), // "public" | "matches_only" | "hidden"
    shareEmail: v.boolean(),
    shareLinkedIn: v.boolean(),
    shareSocials: v.boolean(),
    linkedInUrl: v.optional(v.string()),
    socialLinks: v.optional(v.array(v.object({
      platform: v.string(),
      url: v.string(),
    }))),
    bio: v.optional(v.string()),
    lookingFor: v.optional(v.array(v.string())), // "study_buddy", "project_partner", "mentor", "mentee"
    blockedUsers: v.optional(v.array(v.id("users"))),
    skippedUsers: v.optional(v.array(v.id("users"))),
  }).index("by_user", ["userId"])
    .index("by_enabled", ["enabled"]),

  // ArcConnect match interactions
  arcConnectInteractions: defineTable({
    userId: v.id("users"),
    targetUserId: v.id("users"),
    action: v.string(), // "viewed" | "skipped" | "blocked" | "reported"
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_target", ["userId", "targetUserId"]),

  // Audio call invitations
  callInvitations: defineTable({
    callerId: v.string(),
    receiverId: v.id("users"),
    roomName: v.string(),
    roomUrl: v.string(),
    callerToken: v.string(),
    receiverToken: v.string(),
    status: v.string(), // "pending" | "active" | "declined" | "ended" | "cancelled"
    createdAt: v.number(),
    startedAt: v.optional(v.number()), // When call actually started
    endedAt: v.optional(v.number()), // When call ended
    durationSeconds: v.optional(v.number()), // Total call duration
  }).index("by_caller_status", ["callerId", "status"])
    .index("by_receiver_status", ["receiverId", "status"]),

  // Daily.co usage tracking
  dailyUsage: defineTable({
    participantMinutes: v.number(),
    freeLimit: v.number(),
    percentUsed: v.number(),
    isNearLimit: v.boolean(),
    isOverLimit: v.boolean(),
    lastChecked: v.number(),
    from: v.string(),
    to: v.string(),
  }).index("by_lastChecked", ["lastChecked"]),

  // Password reset tokens
  passwordResetTokens: defineTable({
    userId: v.id("users"),
    email: v.optional(v.string()), // Optional for backward compatibility
    token: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  }).index("by_user", ["userId"])
    .index("by_token", ["token"]),

  // Shop items (power-ups, themes, etc.)
  shopItems: defineTable({
    type: v.string(), // "streak_insurance" | "xp_multiplier" | "theme" | "avatar" | "coin_package"
    name: v.string(),
    description: v.string(),
    price: v.number(),
    icon: v.string(),
    metadata: v.optional(v.object({
      duration: v.optional(v.number()), // For time-limited items (in ms)
      themeId: v.optional(v.string()), // For themes
      multiplier: v.optional(v.number()), // For XP multipliers
      coinAmount: v.optional(v.number()), // For coin packages
      realPrice: v.optional(v.number()), // For coin packages (USD)
    })),
  }).index("by_type", ["type"]),

  // User's purchased items and active power-ups
  userInventory: defineTable({
    userId: v.id("users"),
    itemType: v.string(),
    itemName: v.string(),
    purchasedAt: v.number(),
    expiresAt: v.optional(v.number()), // For time-limited items
    active: v.boolean(), // Whether the item is currently active/equipped
    used: v.optional(v.boolean()), // For consumables like streak insurance
  }).index("by_user", ["userId"])
    .index("by_user_type", ["userId", "itemType"])
    .index("by_user_active", ["userId", "active"]),

  // Purchase history
  purchaseHistory: defineTable({
    userId: v.id("users"),
    itemType: v.string(),
    itemName: v.string(),
    price: v.number(),
    purchasedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Messages between users
  messages: defineTable({
    senderId: v.id("users"),
    recipientId: v.id("users"),
    content: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_sender", ["senderId"])
    .index("by_recipient", ["recipientId"])
    .index("by_conversation", ["senderId", "recipientId"]),

  // Match requests (users must accept before messaging)
  matchRequests: defineTable({
    senderId: v.id("users"),
    recipientId: v.id("users"),
    status: v.string(), // "pending" | "accepted" | "declined"
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  }).index("by_sender", ["senderId"])
    .index("by_recipient", ["recipientId"])
    .index("by_recipient_status", ["recipientId", "status"])
    .index("by_users", ["senderId", "recipientId"]),
  
  apiUsage: defineTable({
    date: v.string(), // YYYY-MM-DD format
    totalCalls: v.number(),
    // Endpoint-specific counts
    smartGoalChat: v.optional(v.number()),
    chat: v.optional(v.number()),
    generateTasks: v.optional(v.number()),
    // Add more endpoints as needed
    userId: v.optional(v.id("users")),
  }).index("by_date", ["date"])
    .index("by_user", ["userId"]),

  // AI Chat History
  aiChatHistory: defineTable({
    userId: v.id("users"),
    endpoint: v.string(), // "smartGoalChat", "chat", "generateTasks", etc.
    userMessage: v.string(),
    aiResponse: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.any()), // Store any additional context (goalDraft, etc.)
  })
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_endpoint", ["endpoint"]),

  emailTracking: defineTable({
    emailId: v.string(), // Unique identifier for each email sent
    recipientEmail: v.string(),
    openedAt: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  })
    .index("by_email_id", ["emailId"])
    .index("by_recipient", ["recipientEmail"])
    .index("by_opened_at", ["openedAt"]),

  unsubscribes: defineTable({
    email: v.string(),
    unsubscribedAt: v.number(),
  })
    .index("by_email", ["email"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
