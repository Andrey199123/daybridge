import { mutation } from "./_generated/server";

// Run this once to populate the shop with items
export const initialize = mutation({
  handler: async (ctx) => {
    // Check if shop is already initialized
    const existing = await ctx.db.query("shopItems").first();
    if (existing) {
      console.log("Shop already initialized, checking for coin packages...");
      
      // Check if coin packages exist
      const coinPackages = await ctx.db
        .query("shopItems")
        .filter((q) => q.eq(q.field("type"), "coin_package"))
        .collect();
      
      if (coinPackages.length === 0) {
        console.log("Adding coin packages...");
        
        // Add coin packages
        await ctx.db.insert("shopItems", {
          type: "coin_package",
          name: "100 care points",
          description: "Small coin package - perfect for getting started",
          price: 0,
          icon: "💰",
          metadata: {
            coinAmount: 100,
            realPrice: 0.99,
          },
        });

        await ctx.db.insert("shopItems", {
          type: "coin_package",
          name: "1,000 care points",
          description: "Popular choice - best value for most users",
          price: 0,
          icon: "💎",
          metadata: {
            coinAmount: 1000,
            realPrice: 4.99,
          },
        });

        await ctx.db.insert("shopItems", {
          type: "coin_package",
          name: "10,000 care points",
          description: "Ultimate package - maximum value and savings",
          price: 0,
          icon: "👑",
          metadata: {
            coinAmount: 10000,
            realPrice: 29.99,
          },
        });
        
        return { message: "Coin packages added successfully!", itemCount: await ctx.db.query("shopItems").collect().then(items => items.length) };
      }
      
      return { message: "Shop already initialized with all items", itemCount: await ctx.db.query("shopItems").collect().then(items => items.length) };
    }

    console.log("Initializing shop...");

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

    // Coin Packages (purchasable with real money)
    await ctx.db.insert("shopItems", {
      type: "coin_package",
      name: "100 care points",
      description: "Small coin package - perfect for getting started",
      price: 0, // Price in coins (not used for coin packages)
      icon: "💰",
      metadata: {
        coinAmount: 100,
        realPrice: 0.99, // $0.99 USD
      },
    });

    await ctx.db.insert("shopItems", {
      type: "coin_package",
      name: "1,000 care points",
      description: "Popular choice - best value for most users",
      price: 0,
      icon: "💎",
      metadata: {
        coinAmount: 1000,
        realPrice: 4.99, // $4.99 USD
      },
    });

    await ctx.db.insert("shopItems", {
      type: "coin_package",
      name: "10,000 care points",
      description: "Ultimate package - maximum value and savings",
      price: 0,
      icon: "👑",
      metadata: {
        coinAmount: 10000,
        realPrice: 29.99, // $29.99 USD
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

    console.log("Shop initialized successfully with 6 items");
    return { message: "Shop initialized successfully", itemCount: 6 };
  },
});
