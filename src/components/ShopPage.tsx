import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Coins, Sparkles, Shield, Zap, Palette, Clock, Check, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export function ShopPage() {
  const navigate = useNavigate();
  const shopItems = useQuery(api.shop.getShopItems);
  const userInventory = useQuery(api.shop.getUserInventory);
  const activePowerUps = useQuery(api.shop.getActivePowerUps);
  const currentUser = useQuery(api.users.getCurrentUser);
  const purchaseItem = useMutation(api.shop.purchaseItem);
  const equipTheme = useMutation(api.shop.equipTheme);
  const unequipTheme = useMutation(api.shop.unequipTheme);
  const initializeShop = useMutation(api.initShop.initialize);
  const fixMultipleEquippedThemes = useMutation(api.shop.fixMultipleEquippedThemes);
  const purchaseCoinPackage = useMutation(api.shop.purchaseCoinPackage);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [addingCoins, setAddingCoins] = useState(false);
  const [unequipping, setUnequipping] = useState(false);

  const userCoins = currentUser?.profile?.coins || 0;
  const lemonSqueezyStoreId = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID || "";

  const handleInitializeShop = async () => {
    setInitializing(true);
    try {
      const result = await initializeShop({});
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to initialize shop");
    } finally {
      setInitializing(false);
    }
  };

  const handleFixThemes = async () => {
    setFixing(true);
    try {
      const result = await fixMultipleEquippedThemes({});
      if (result.fixed) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fix themes");
    } finally {
      setFixing(false);
    }
  };

  const handleAddCoinPackages = async () => {
    setAddingCoins(true);
    try {
      const result = await initializeShop({});
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || "Failed to add coin packages");
    } finally {
      setAddingCoins(false);
    }
  };

  const handlePurchase = async (item: any) => {
    if (userCoins < item.price) {
      toast.error("Insufficient care points!");
      return;
    }

    setPurchasing(item._id);
    try {
      const result = await purchaseItem({
        itemType: item.type,
        itemName: item.name,
        price: item.price,
        metadata: item.metadata,
      });

      toast.success(`${item.name} purchased!`, {
        description: `${result.coinsRemaining} care points remaining`,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to purchase item");
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquipTheme = async (inventoryId: string) => {
    try {
      await equipTheme({ inventoryId: inventoryId as any });
      toast.success("Theme equipped!");
    } catch (error: any) {
      toast.error(error.message || "Failed to equip theme");
    }
  };

  const handleUnequipTheme = async () => {
    setUnequipping(true);
    try {
      await unequipTheme({});
      toast.success("Theme unequipped! Using default theme.");
    } catch (error: any) {
      toast.error(error.message || "Failed to unequip theme");
    } finally {
      setUnequipping(false);
    }
  };

  const handlePurchaseCoinPackage = async (item: any) => {
    const coinAmount = item.metadata?.coinAmount || 0;
    const realPrice = item.metadata?.realPrice || 0;

    if (!lemonSqueezyStoreId || lemonSqueezyStoreId === "your_store_id_here") {
      toast.error("Payment system not configured. Please contact support.");
      return;
    }

    setPurchasing(item._id);

    try {
      // Create checkout URL with Lemon Squeezy
      const checkoutUrl = `https://arc-shop.lemonsqueezy.com/checkout/buy/${getProductVariantId(coinAmount)}?checkout[custom][user_id]=${currentUser?._id}&checkout[custom][coin_amount]=${coinAmount}`;
      
      // Open Lemon Squeezy checkout in new window
      const checkoutWindow = window.open(checkoutUrl, '_blank', 'width=800,height=900');
      
      if (!checkoutWindow) {
        toast.error("Please allow popups to complete your purchase");
        setPurchasing(null);
        return;
      }

      toast.info("Complete your purchase in the new window");

      // Listen for payment completion (you'll need to set up webhooks)
      // For now, we'll use a simple polling mechanism
      const pollInterval = setInterval(async () => {
        // Check if window is closed
        if (checkoutWindow.closed) {
          clearInterval(pollInterval);
          setPurchasing(null);
          toast.info("Purchase window closed. If you completed payment, coins will be added shortly.");
        }
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || "Failed to initiate purchase");
      setPurchasing(null);
    }
  };

  // Map coin amounts to Lemon Squeezy product variant IDs
  // You'll need to create products in Lemon Squeezy and update these IDs
  const getProductVariantId = (coinAmount: number): string => {
    const variantMap: Record<number, string> = {
      100: "variant_id_for_100_coins",
      1000: "variant_id_for_1000_coins",
      10000: "variant_id_for_10000_coins",
    };
    return variantMap[coinAmount] || "";
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "streak_insurance":
        return Shield;
      case "xp_multiplier":
        return Zap;
      case "theme":
        return Palette;
      default:
        return Sparkles;
    }
  };

  const isOwned = (itemName: string) => {
    return userInventory?.some(inv => inv.itemName === itemName);
  };

  const isActive = (itemName: string) => {
    return activePowerUps?.some(inv => inv.itemName === itemName);
  };

  const getOwnedItem = (itemName: string) => {
    return userInventory?.find(inv => inv.itemName === itemName);
  };

  const formatTimeRemaining = (expiresAt?: number) => {
    if (!expiresAt) return null;
    const now = Date.now();
    const remaining = expiresAt - now;
    if (remaining <= 0) return "Expired";
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  // Group items by type
  const powerUps = shopItems?.filter(item => item.type === "xp_multiplier" || item.type === "streak_insurance");
  const themes = shopItems?.filter(item => item.type === "theme");
  const coinPackages = shopItems?.filter(item => item.type === "coin_package");

  // Check if multiple themes are equipped
  const equippedThemesCount = userInventory?.filter(inv => inv.itemType === "theme" && inv.active).length || 0;
  const needsThemeFix = equippedThemesCount > 1;

  // Show initialization button if no items
  if (shopItems && shopItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2a] to-[#1a1a3a] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Support Shop</h1>
            <p className="text-white/60 mb-8">The shop needs to be initialized first</p>
            <button
              onClick={handleInitializeShop}
              disabled={initializing}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {initializing ? "Initializing..." : "Initialize Shop"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2a] to-[#1a1a3a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back to Galaxy</span>
              </motion.button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  Support Shop
                </h1>
                <p className="text-white/60 mt-2">Use care points for supportive upgrades</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
              <Coins className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-sm text-white/60">Your Balance</p>
                <p className="text-2xl font-bold text-yellow-400">{userCoins}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coin Packages Section */}
        {coinPackages && coinPackages.length > 0 ? (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Coins className="w-6 h-6 text-yellow-400" />
              Buy care points
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coinPackages.map((item) => {
                const coinAmount = item.metadata?.coinAmount || 0;
                const realPrice = item.metadata?.realPrice || 0;

                return (
                  <motion.div
                    key={item._id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-3xl p-6 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 opacity-0 hover:opacity-100 transition-opacity" />
                    
                    <div className="relative z-10">
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-3">{item.icon}</div>
                        <h3 className="text-2xl font-bold text-yellow-400">{item.name}</h3>
                        <p className="text-white/60 text-sm mt-2">{item.description}</p>
                      </div>

                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-white mb-1">
                          ${realPrice.toFixed(2)}
                        </div>
                        <div className="text-sm text-white/50">
                          {coinAmount.toLocaleString()} coins
                        </div>
                      </div>

                      <button
                        onClick={() => handlePurchaseCoinPackage(item)}
                        disabled={purchasing === item._id || !lemonSqueezyStoreId || lemonSqueezyStoreId === "your_store_id_here"}
                        className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-black"
                      >
                        {!lemonSqueezyStoreId || lemonSqueezyStoreId === "your_store_id_here" 
                          ? "Configure Payment" 
                          : purchasing === item._id 
                          ? "Opening checkout..." 
                          : "Purchase"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
              <Coins className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Coin Packages Not Available</h3>
              <p className="text-white/60 mb-4">Click below to add coin purchase options to the shop</p>
              <button
                onClick={handleAddCoinPackages}
                disabled={addingCoins}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {addingCoins ? "Adding..." : "Add Coin Packages"}
              </button>
            </div>
          </div>
        )}

        {/* Power-Ups Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-cyan-400" />
            Power-Ups
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {powerUps?.map((item) => {
              const Icon = getItemIcon(item.type);
              const owned = isOwned(item.name);
              const active = isActive(item.name);
              const ownedItem = getOwnedItem(item.name);
              const timeRemaining = ownedItem?.expiresAt ? formatTimeRemaining(ownedItem.expiresAt) : null;

              return (
                <motion.div
                  key={item._id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-6 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 hover:opacity-100 transition-opacity" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-2xl font-bold">{item.icon}</div>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-white/60 text-sm mb-4">{item.description}</p>

                    {active && timeRemaining && (
                      <div className="flex items-center gap-2 mb-4 text-green-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{timeRemaining}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Coins className="w-5 h-5 text-yellow-400" />
                        <span className="text-xl font-bold text-yellow-400">{item.price}</span>
                      </div>

                      {owned ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                          <Check className="w-4 h-4" />
                          {active ? "Active" : item.type === "streak_insurance" && !ownedItem?.used ? "Ready" : "Owned"}
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasing === item._id || userCoins < item.price}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {purchasing === item._id ? "Purchasing..." : "Buy Now"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Themes Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6 text-purple-400" />
              Galaxy Themes
            </h2>
            <div className="flex items-center gap-3">
              {userInventory?.some(inv => inv.itemType === "theme" && inv.active) && (
                <button
                  onClick={handleUnequipTheme}
                  disabled={unequipping}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm"
                >
                  {unequipping ? "Unequipping..." : "Unequip Theme"}
                </button>
              )}
              {needsThemeFix && (
                <button
                  onClick={handleFixThemes}
                  disabled={fixing}
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg font-semibold transition-all disabled:opacity-50 text-sm text-yellow-400"
                >
                  {fixing ? "Fixing..." : "Fix Multiple Equipped Themes"}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {themes?.map((item) => {
              const owned = isOwned(item.name);
              const active = isActive(item.name);
              const ownedItem = getOwnedItem(item.name);

              const themeColors: Record<string, string> = {
                nebula: "from-purple-500 via-pink-500 to-purple-600",
                solar: "from-orange-500 via-red-500 to-yellow-600",
                deepspace: "from-blue-900 via-black to-blue-950",
                aurora: "from-green-400 via-blue-500 to-purple-500",
              };

              const themeGradient = themeColors[item.metadata?.themeId || ""] || "from-cyan-500 to-purple-500";

              return (
                <motion.div
                  key={item._id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-6 relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${themeGradient} opacity-20`} />
                  
                  <div className="relative z-10">
                    <div className="text-4xl mb-3 text-center">{item.icon}</div>
                    <h3 className="text-lg font-bold mb-2 text-center">{item.name}</h3>
                    <p className="text-white/60 text-xs mb-4 text-center">{item.description}</p>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <Coins className="w-4 h-4 text-yellow-400" />
                        <span className="text-lg font-bold text-yellow-400">{item.price}</span>
                      </div>

                      {owned ? (
                        active ? (
                          <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-medium py-2">
                            <Check className="w-4 h-4" />
                            Equipped
                          </div>
                        ) : (
                          <button
                            onClick={() => ownedItem && handleEquipTheme(ownedItem._id)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-all text-sm"
                          >
                            Equip
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handlePurchase(item)}
                          disabled={purchasing === item._id || userCoins < item.price}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {purchasing === item._id ? "Buying..." : "Buy"}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            How to Earn care points
          </h3>
          <ul className="text-white/80 text-sm space-y-2">
            <li>• Complete tasks: <span className="text-yellow-400 font-semibold">2-3 coins</span></li>
            <li>• Complete milestones: <span className="text-yellow-400 font-semibold">10 coins</span></li>
            <li>• Complete care plans: <span className="text-yellow-400 font-semibold">25 coins</span></li>
            <li>• Complete tasks: <span className="text-yellow-400 font-semibold">earn care points over time</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
