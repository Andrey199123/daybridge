import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Get all shop items
export const getShopItems = query({
  handler: async (ctx) => {
    return await ctx.db.query("shopItems").collect();
  },
});

// Get user's inventory
export const getUserInventory = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("userInventory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// Get active power-ups for user
export const getActivePowerUps = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const inventory = await ctx.db
      .query("userInventory")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("active", true))
      .collect();

    // Filter out expired items
    return inventory.filter(item => !item.expiresAt || item.expiresAt > now);
  },
});

// Check if user has active XP multiplier
export const hasActiveXPMultiplier = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { active: false, multiplier: 1 };

    const now = Date.now();
    const multiplier = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "xp_multiplier"))
      .filter((q) => q.and(
        q.eq(q.field("active"), true),
        q.or(
          q.eq(q.field("expiresAt"), undefined),
          q.gt(q.field("expiresAt"), now)
        )
      ))
      .first();

    return {
      active: !!multiplier,
      multiplier: multiplier ? 2 : 1,
      expiresAt: multiplier?.expiresAt,
    };
  },
});

// Check if user has unused streak insurance
export const hasStreakInsurance = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const insurance = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "streak_insurance"))
      .filter((q) => q.eq(q.field("used"), false))
      .first();

    return !!insurance;
  },
});

// Purchase coin package with real money (x402 payment)
export const purchaseCoinPackage = mutation({
  args: {
    itemName: v.string(),
    coinAmount: v.number(),
    paymentProof: v.string(), // x402 payment proof/receipt
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const currentCoins = profile.coins || 0;

    // Add purchased coins
    await ctx.db.patch(profile._id, {
      coins: currentCoins + args.coinAmount,
    });

    // Record purchase in history
    await ctx.db.insert("purchaseHistory", {
      userId,
      itemType: "coin_package",
      itemName: args.itemName,
      price: 0, // Real money purchase, not coin purchase
      purchasedAt: Date.now(),
    });

    return { 
      success: true, 
      newBalance: currentCoins + args.coinAmount,
      coinsAdded: args.coinAmount,
    };
  },
});

// Purchase an item
export const purchaseItem = mutation({
  args: {
    itemType: v.string(),
    itemName: v.string(),
    price: v.number(),
    metadata: v.optional(v.object({
      duration: v.optional(v.number()),
      themeId: v.optional(v.string()),
      multiplier: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get user profile to check coins
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const currentCoins = profile.coins || 0;
    if (currentCoins < args.price) {
      throw new Error("Insufficient care points");
    }

    // Deduct coins
    await ctx.db.patch(profile._id, {
      coins: currentCoins - args.price,
    });

    // Add to inventory
    const now = Date.now();
    const expiresAt = args.metadata?.duration ? now + args.metadata.duration : undefined;

    // For themes, deactivate all other themes first
    if (args.itemType === "theme") {
      const allThemes = await ctx.db
        .query("userInventory")
        .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "theme"))
        .collect();
      
      for (const theme of allThemes) {
        await ctx.db.patch(theme._id, { active: false });
      }
    }

    await ctx.db.insert("userInventory", {
      userId,
      itemType: args.itemType,
      itemName: args.itemName,
      purchasedAt: now,
      expiresAt,
      active: args.itemType === "xp_multiplier" || args.itemType === "theme", // Auto-activate
      used: false,
    });

    // Record purchase history
    await ctx.db.insert("purchaseHistory", {
      userId,
      itemType: args.itemType,
      itemName: args.itemName,
      price: args.price,
      purchasedAt: now,
    });

    return { success: true, coinsRemaining: currentCoins - args.price };
  },
});

// Use streak insurance (called internally when streak would break)
export const useStreakInsurance = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const insurance = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", args.userId).eq("itemType", "streak_insurance"))
      .filter((q) => q.eq(q.field("used"), false))
      .first();

    if (!insurance) return false;

    // Mark as used
    await ctx.db.patch(insurance._id, {
      used: true,
      active: false,
    });

    return true;
  },
});

// Equip/activate a theme
export const equipTheme = mutation({
  args: {
    inventoryId: v.id("userInventory"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.inventoryId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    if (item.itemType !== "theme") {
      throw new Error("Can only equip themes");
    }

    // Deactivate all other themes
    const allThemes = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "theme"))
      .collect();

    for (const theme of allThemes) {
      if (theme._id !== args.inventoryId) {
        await ctx.db.patch(theme._id, { active: false });
      }
    }

    // Activate this theme
    await ctx.db.patch(args.inventoryId, { active: true });

    return { success: true };
  },
});

// Unequip a theme (return to default)
export const unequipTheme = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Deactivate all themes
    const allThemes = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "theme"))
      .collect();

    for (const theme of allThemes) {
      await ctx.db.patch(theme._id, { active: false });
    }

    return { success: true };
  },
});

// Get purchase history
export const getPurchaseHistory = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("purchaseHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});

// Get active theme
export const getActiveTheme = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const activeTheme = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "theme"))
      .filter((q) => q.eq(q.field("active"), true))
      .first();

    return activeTheme;
  },
});

// Fix multiple equipped themes (one-time fix)
export const fixMultipleEquippedThemes = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all active themes
    const allThemes = await ctx.db
      .query("userInventory")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("itemType", "theme"))
      .collect();

    const activeThemes = allThemes.filter(t => t.active);

    if (activeThemes.length <= 1) {
      return { message: "No fix needed - only one or zero themes equipped", fixed: false };
    }

    // Keep the first active theme, deactivate the rest
    const [keepActive, ...deactivate] = activeThemes;

    for (const theme of deactivate) {
      await ctx.db.patch(theme._id, { active: false });
    }

    return { 
      message: `Fixed! Kept "${keepActive.itemName}" equipped and deactivated ${deactivate.length} other theme(s)`,
      fixed: true,
      keptTheme: keepActive.itemName,
      deactivatedCount: deactivate.length
    };
  },
});

// Initialize shop items (run once to populate the shop)
export const initializeShop = mutation({
  handler: async (ctx) => {
    // Check if shop is already initialized
    const existing = await ctx.db.query("shopItems").first();
    if (existing) return { message: "Shop already initialized" };

    // Streak Insurance
    await ctx.db.insert("shopItems", {
      type: "streak_insurance",
      name: "Streak Insurance",
      description: "Protect your streak! If you miss a day, this will automatically save your streak.",
      price: 100,
      icon: "🛡️",
      metadata: {},
    });

    // XP Multiplier
    await ctx.db.insert("shopItems", {
      type: "xp_multiplier",
      name: "2x XP Boost",
      description: "Double all XP earned for 24 hours!",
      price: 50,
      icon: "⚡",
      metadata: {
        duration: 24 * 60 * 60 * 1000, // 24 hours in ms
        multiplier: 2,
      },
    });

    // Themes
    await ctx.db.insert("shopItems", {
      type: "theme",
      name: "Nebula Theme",
      description: "Purple and pink cosmic nebula theme",
      price: 50,
      icon: "🌌",
      metadata: {
        themeId: "nebula",
      },
    });

    await ctx.db.insert("shopItems", {
      type: "theme",
      name: "Solar Flare Theme",
      description: "Fiery orange and red solar theme",
      price: 75,
      icon: "☀️",
      metadata: {
        themeId: "solar",
      },
    });

    await ctx.db.insert("shopItems", {
      type: "theme",
      name: "Deep Space Theme",
      description: "Dark blue and black deep space theme",
      price: 50,
      icon: "🌑",
      metadata: {
        themeId: "deepspace",
      },
    });

    await ctx.db.insert("shopItems", {
      type: "theme",
      name: "Aurora Theme",
      description: "Green and blue aurora borealis theme",
      price: 100,
      icon: "🌠",
      metadata: {
        themeId: "aurora",
      },
    });

    return { message: "Shop initialized successfully" };
  },
});
