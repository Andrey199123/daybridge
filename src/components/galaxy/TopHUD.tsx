import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardPlus, Flame, User as UserIcon, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProfileMenu, EnhancedProfileModal } from "../profile";
import { StreakModal } from "../StreakModal";
import { FeedbackModal } from "../FeedbackModal";
import { CalendarExportModal } from "../CalendarExportModal";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { removeSessionStorage } from "../../lib/browser";

const rankThresholds = {
  helper: { min: 0, max: 999, next: 1000 },
  steady: { min: 1000, max: 4999, next: 5000 },
  anchor: { min: 5000, max: 14999, next: 15000 },
  "care lead": { min: 15000, max: Infinity, next: null },
  cadet: { min: 0, max: 999, next: 1000 },
  explorer: { min: 1000, max: 4999, next: 5000 },
  commander: { min: 5000, max: 14999, next: 15000 },
  architect: { min: 15000, max: Infinity, next: null }
};

type TabType = "profile" | "settings" | "preferences";

export function TopHUD({ user, onLaunchClick }) {
  const navigate = useNavigate();
  const [xpAnimation, setXpAnimation] = useState(false);
  const [prevXP, setPrevXP] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showCalendarExport, setShowCalendarExport] = useState(false);
  const [modalTab, setModalTab] = useState<TabType>("profile");
  const avatarRef = useRef<HTMLDivElement>(null);
  
  // Get unread message count and latest sender
  const unreadData = useQuery(api.messages.getUnreadCount);
  const unreadCount = unreadData?.count || 0;
  
  // Tutorial replay mutation
  const resetTutorial = useMutation(api.users.resetTutorial);
  
  const handleReplayTutorial = async () => {
    try {
      await resetTutorial();
      // Clear tutorial state from session storage
      removeSessionStorage('tutorialProgress');
      removeSessionStorage('tutorialPaused');
      removeSessionStorage('tutorialActive');
      
      toast.success('Tutorial reset! Starting now...');
    } catch (error) {
      toast.error('Failed to reset tutorial');
      console.error('Tutorial reset error:', error);
    }
  };

  useEffect(() => {
    if (user && user.xp_points !== prevXP) {
      setXpAnimation(true);
      setTimeout(() => setXpAnimation(false), 1000);
      setPrevXP(user.xp_points);
    }
  }, [user?.xp_points]);

  // Show toast notification when new messages arrive
  useEffect(() => {
    if (unreadCount !== undefined && unreadCount > prevUnreadCount && prevUnreadCount > 0) {
      const senderName = unreadData?.latestSenderName || "Someone";
      toast.info(`New message from ${senderName}!`, {
        action: {
          label: 'View',
          onClick: () => {
            if (unreadData?.latestSender) {
              navigate('/connect', { 
                state: { 
                  openChat: true, 
                  userId: unreadData.latestSender,
                  userName: senderName
                } 
              });
            } else {
              navigate('/connect');
            }
          },
        },
      });
    }
    if (unreadCount !== undefined) {
      setPrevUnreadCount(unreadCount);
    }
  }, [unreadCount, unreadData]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getRankDisplay = (rank) => {
    const ranks = {
      helper: { label: "Helper", icon: "Care" },
      steady: { label: "Steady", icon: "Care" },
      anchor: { label: "Anchor", icon: "Care" },
      "care lead": { label: "Care Lead", icon: "Care" },
      cadet: { label: "Helper", icon: "Care" },
      explorer: { label: "Steady", icon: "Care" },
      commander: { label: "Anchor", icon: "Care" },
      architect: { label: "Care Lead", icon: "Care" }
    };
    return ranks[rank] || ranks.helper;
  };

  const getXPProgress = () => {
    if (!user) return { percent: 0, current: 0, needed: 1000 };
    const xp = user.xp_points || 0;
    const currentRank = user.rank || 'helper';
    const threshold = rankThresholds[currentRank];
    const progress = threshold.next ? ((xp - threshold.min) / (threshold.next - threshold.min)) * 100 : 100;
    return { 
      percent: Math.min(100, progress), 
      current: xp,
      needed: threshold.next 
    };
  };

  const xpData = getXPProgress();
  const rankData = user ? getRankDisplay(user.rank) : getRankDisplay('helper');

  return (
    <header 
      className={`h-20 border-b border-white/10 glass-panel sticky top-0 z-50 backdrop-blur-xl transition-all duration-300 ${
        isScrolled ? 'shadow-lg shadow-black/20 bg-[var(--bg-space-900)]/95' : 'bg-[var(--bg-space-900)]/80'
      }`}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4 relative">
        {/* Animated background accent */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[var(--accent-violet)]/5 via-transparent to-[var(--accent-cyan)]/5"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4 relative z-10 flex-shrink-0">
          <motion.div 
            className="flex items-center gap-2 sm:gap-3 flex-shrink-0"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="w-11 h-11 rounded-xl glow-gradient flex items-center justify-center relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
            >
              <ClipboardPlus className="w-6 h-6 text-white relative z-10" />
              <motion.div
                className="absolute inset-0 bg-white"
                animate={{ opacity: [0, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold tracking-normal text-white">
                DayBridge Care Board
              </h1>
              {user && (
                <div className="flex items-center gap-2 mt-0.5">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative"
                  >
                    <Badge className="bg-gradient-to-r from-[var(--accent-violet)]/20 to-[var(--accent-cyan)]/20 text-white border border-[var(--accent-violet)]/30 text-xs font-medium px-2 py-0.5">
                      {rankData.label}
                    </Badge>
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-cyan)] blur-lg opacity-20" />
                  </motion.div>
                  <span className="text-xs text-white/60 font-medium">
                    {xpData.current.toLocaleString()} XP
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Energy Core XP Bar */}
          <motion.div 
            className="relative w-[clamp(140px,18vw,288px)] flex-shrink"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            data-tutorial="xp-bar"
          >
            <div className="w-full h-12 bg-gradient-to-r from-[var(--accent-violet)]/10 via-[var(--accent-cyan)]/5 to-transparent rounded-2xl overflow-hidden relative border-2 border-[var(--accent-cyan)]/50 backdrop-blur-sm shadow-[0_0_15px_rgba(108,99,255,0.2)]">
              <motion.div
                className="h-full rounded-2xl relative"
                style={{ 
                  background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))',
                  width: `${xpData.percent}%`
                }}
                animate={xpAnimation ? {
                  scale: [1, 1.02, 1],
                  boxShadow: [
                    '0 0 20px rgba(0, 224, 255, 0.3)',
                    '0 0 40px rgba(108, 99, 255, 0.6)',
                    '0 0 20px rgba(0, 224, 255, 0.3)'
                  ]
                } : {}}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{ 
                    background: [
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                    ],
                    x: ['-100%', '200%']
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              
              <div className="absolute inset-0 flex items-center justify-center px-2">
                <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-white drop-shadow-lg tracking-wide truncate">
                  <span className="hidden lg:inline">CARE POINTS {xpData.needed ? `• ${xpData.needed - xpData.current} TO NEXT` : '• COMPLETE'}</span>
                  <span className="hidden md:inline lg:hidden">CARE • {xpData.current.toLocaleString()}</span>
                  <span className="md:hidden">{xpData.current.toLocaleString()}</span>
                </span>
              </div>

              {/* Pulse rings on XP gain */}
              <AnimatePresence>
                {xpAnimation && (
                  <>
                    <motion.div
                      className="absolute inset-0 border-2 border-[var(--accent-cyan)] rounded-full"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                    <motion.div
                      className="absolute inset-0 border-2 border-[var(--accent-violet)] rounded-full"
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    />
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Center Section - Streak Bar */}
        {user && (
          <motion.div 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer w-[clamp(100px,15vw,224px)] flex-shrink relative z-10"
            onClick={() => setShowStreakModal(true)}
            data-tutorial="streak-button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <div className="w-full h-10 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent rounded-2xl overflow-hidden relative border-2 border-orange-500/50 backdrop-blur-sm shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              {/* Animated fill based on streak - fills from left */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ 
                  background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.25), rgba(234, 88, 12, 0.2), rgba(220, 38, 38, 0.15))',
                  width: `${Math.min(100, ((user.current_streak || 0) / 30) * 100)}%` // Fill up to 30 days
                }}
                animate={{
                  boxShadow: [
                    'inset 0 0 20px rgba(249, 115, 22, 0.2)',
                    'inset 0 0 30px rgba(249, 115, 22, 0.4)',
                    'inset 0 0 20px rgba(249, 115, 22, 0.2)'
                  ]
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ 
                    background: [
                      'linear-gradient(90deg, transparent, rgba(255,200,100,0.3), transparent)',
                      'linear-gradient(90deg, transparent, rgba(255,200,100,0.3), transparent)'
                    ],
                    x: ['-100%', '200%']
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
              
              {/* Center content with animated flame and number */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 px-2">
                {/* Animated Flame with multiple effects */}
                <motion.div
                  className="relative flex-shrink-0"
                  animate={{
                    y: [0, -3, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Flame className="w-5 h-5 text-orange-400 fill-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                  </motion.div>
                  {/* Glow effect behind flame */}
                  <motion.div
                    className="absolute inset-0 bg-orange-400 rounded-full blur-lg"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
                
                <div className="flex flex-col items-start min-w-0 flex-shrink">
                  <span className="text-[8px] font-semibold text-orange-300/80 uppercase tracking-wider leading-none truncate w-full">
                    Streak
                  </span>
                  <span className="text-base font-bold text-white drop-shadow-lg leading-tight truncate w-full">
                    {user.current_streak || 0}<span className="hidden lg:inline"> </span><span className="hidden lg:inline">{(user.current_streak || 0) === 1 ? 'Day' : 'Days'}</span>
                  </span>
                </div>
              </div>

              {/* Pulse rings on hover */}
              <motion.div
                className="absolute inset-0 border-2 border-orange-400 rounded-2xl opacity-0 pointer-events-none"
                whileHover={{ 
                  scale: [1, 1.05],
                  opacity: [0.6, 0]
                }}
                transition={{ duration: 0.6 }}
              />
              
              {/* Particle effects */}
              {(user.current_streak || 0) > 0 && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-orange-400 rounded-full"
                      style={{
                        left: `${20 + i * 30}%`,
                        bottom: '15%',
                      }}
                      animate={{
                        y: [-3, -12, -3],
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: i * 0.4,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Right Section */}
        <motion.div 
          className="flex items-center gap-2 sm:gap-3 relative z-10 flex-shrink-0"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={onLaunchClick}
              className="arc-primary-gradient text-white font-semibold border-0 relative overflow-hidden group px-3 md:px-4"
              data-tutorial="launch-button"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-white/10"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <ClipboardPlus className="w-4 h-4 md:mr-2 relative z-10" />
              <span className="relative z-10 hidden md:inline">Add Care Plan</span>
            </Button>
          </motion.div>

          {user && (
            <>
              {/* Messages Button */}
              <motion.div whileHover={{ scale: 1.05 }} className="relative">
                <button
                  onClick={() => {
                    if (unreadData?.latestSender && unreadData?.latestSenderName) {
                      navigate('/connect', { 
                        state: { 
                          openChat: true, 
                          userId: unreadData.latestSender,
                          userName: unreadData.latestSenderName
                        } 
                      });
                    } else {
                      navigate('/connect');
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center relative cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50"
                  aria-label="View messages"
                  title="Messages"
                >
                  <MessageCircle className="w-5 h-5 text-white/80 relative z-10" />
                  {unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.div>
                  )}
                </button>
              </motion.div>

              <motion.div 
                ref={avatarRef}
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="relative"
                data-tutorial="profile-button"
              >
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-violet)] flex items-center justify-center relative overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50"
                  aria-label="Open profile menu"
                  aria-expanded={showProfileMenu}
                  aria-haspopup="menu"
                >
                  <UserIcon className="w-5 h-5 text-white relative z-10" />
                  <motion.div
                    className="absolute inset-0 bg-white"
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </button>

                <ProfileMenu
                  isOpen={showProfileMenu}
                  onClose={() => setShowProfileMenu(false)}
                  onOpenProfile={() => {
                    setModalTab("profile");
                    setShowProfileModal(true);
                  }}
                  onOpenSettings={() => {
                    setModalTab("settings");
                    setShowProfileModal(true);
                  }}
                  onOpenFeedback={() => setShowFeedbackModal(true)}
                  onOpenCalendarExport={() => setShowCalendarExport(true)}
                  onReplayTutorial={handleReplayTutorial}
                  triggerRef={avatarRef}
                />
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      {/* Profile Modal */}
      <EnhancedProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab={modalTab}
      />

      {/* Streak Modal */}
      <StreakModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
      />

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
      )}

      {/* Calendar Export Modal */}
      <CalendarExportModal
        isOpen={showCalendarExport}
        onClose={() => setShowCalendarExport(false)}
      />
    </header>
  );
}
