import React, { useState, useEffect, useMemo } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { motion, AnimatePresence } from "framer-motion";
import { TopHUD } from "./components/galaxy/TopHUD";
import { LeftNavigation } from "./components/galaxy/LeftNavigation";
import { ArcNavigator } from "./components/galaxy/ArcNavigator";
import { LaunchMissionModal } from "./components/galaxy/LaunchMissionModal";
import { GoalDrawer } from "./components/galaxy/GoalDrawer";
import { SchedulingModal } from "./components/SchedulingModal";
import { AudioCallProvider } from "./components/AudioCall";
import { GoalsService, UserMetaService, TasksService } from './services';
import { Id } from "../convex/_generated/dataModel";
import { ArrowLeft, Sparkles } from "lucide-react";
import { trackEvent } from "./lib/analytics";
import {
  clearGuestSession,
  GUEST_MODE_KEY,
  readSessionStorage,
  removeSessionStorage,
} from "./lib/browser";

export function AppLayout() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const trackDailyLogin = useMutation(api.streaks.trackDailyLogin);
  const ensureGuestProfile = useMutation(api.users.ensureGuestProfile);
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);
  const [hasTrackedLogin, setHasTrackedLogin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Shared state for the layout
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals"> | null>(null);
  const [activeNav, setActiveNav] = useState("galaxy");
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingGoalId, setSchedulingGoalId] = useState<Id<"goals"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTutorialNotification, setShowTutorialNotification] = useState(false);
  const [guestUpgradeGoalId, setGuestUpgradeGoalId] = useState<Id<"goals"> | null>(null);
  const [guestProfileReady, setGuestProfileReady] = useState(false);
  const [guestReconnectPending, setGuestReconnectPending] = useState(false);
  const ambientParticles = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 5,
      })),
    [],
  );

  // Data hooks
  const user = UserMetaService.useGetCurrent();
  const activeGoals = GoalsService.useList('active');
  const allTasks = TasksService.useGetAll(); // Get ALL tasks, not just today's

  const hasGuestSession = readSessionStorage(GUEST_MODE_KEY) === "true";
  const isGuestMode = hasGuestSession || currentUser?.isAnonymous === true;

  useEffect(() => {
    if (
      !hasGuestSession ||
      currentUser !== null ||
      currentUser === undefined ||
      isAuthLoading ||
      isAuthenticated
    ) {
      setGuestReconnectPending(false);
      return;
    }

    setGuestReconnectPending(true);
    const timeoutId = window.setTimeout(() => {
      setGuestReconnectPending(false);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentUser, hasGuestSession, isAuthLoading, isAuthenticated]);

  const isLoading = isAuthLoading || currentUser === undefined || guestReconnectPending;

  useEffect(() => {
    setGuestProfileReady(false);
  }, [currentUser?.id]);

  // Track daily login once when user is authenticated
  useEffect(() => {
    if (currentUser && !hasTrackedLogin) {
      const hasSkipped = readSessionStorage('skipOnboarding') === 'true';
      if (currentUser.profile?.completedOnboarding || hasSkipped) {
        const localDate = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
        trackDailyLogin({ localDate }).then(() => {
          setHasTrackedLogin(true);
        }).catch((error) => {
          console.error("Failed to track daily login:", error);
        });
      }
    }
  }, [currentUser, hasTrackedLogin, trackDailyLogin]);

  useEffect(() => {
    if (!currentUser || currentUser.profile || guestProfileReady || !isGuestMode) {
      return;
    }

    let cancelled = false;

    ensureGuestProfile()
      .then(() => {
        if (!cancelled) {
          setGuestProfileReady(true);
        }
      })
      .catch((error) => {
        console.error("Failed to ensure guest profile:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, ensureGuestProfile, guestProfileReady, isGuestMode]);

  // Determine active nav from URL
  const getActiveNavFromPath = (path: string) => {
    if (path.includes('/timeline')) return 'timeline';
    if (path.includes('/missions')) return 'missions';
    if (path.includes('/achievements')) return 'achievements';
    if (path.includes('/skills')) return 'skills';
    if (path.includes('/resume')) return 'resume';
    if (path.includes('/connect')) return 'connect';
    if (path.includes('/goal/')) return 'galaxy'; // Care plan detail stays on day map
    return 'galaxy';
  };

  // Sync activeNav with URL
  useEffect(() => {
    const navFromPath = getActiveNavFromPath(location.pathname);
    if (navFromPath !== activeNav) {
      setActiveNav(navFromPath);
    }
  }, [location.pathname]);

  // Check for paused tutorial and show notification on non-Galaxy pages
  useEffect(() => {
    const tutorialPaused = readSessionStorage('tutorialPaused');
    const isGalaxyView = location.pathname === '/dashboard';
    
    // Only show notification if tutorial is paused AND user hasn't completed it AND we're not on the day map
    const shouldShowNotification = tutorialPaused === 'true' && 
                                   !currentUser?.profile?.completedTutorial && 
                                   !isGalaxyView;
    
    setShowTutorialNotification(shouldShowNotification);
  }, [location.pathname, currentUser?.profile?.completedTutorial]);

  // Clear skip flag if user has completed onboarding
  useEffect(() => {
    if (currentUser?.profile?.completedOnboarding === true) {
      removeSessionStorage('skipOnboarding');
      clearGuestSession();
    }
  }, [currentUser?.profile?.completedOnboarding]);

  // Check if user chose to skip onboarding
  const hasSkippedOnboarding = readSessionStorage('skipOnboarding') === 'true';
  const hasCompletedOnboarding = currentUser?.profile?.completedOnboarding === true;
  const isAnonymousUser = currentUser?.isAnonymous === true;
  const shouldRedirectToAuth =
    (!isLoading && !guestReconnectPending && currentUser === null) ||
    (!isLoading && !hasCompletedOnboarding && !hasSkippedOnboarding && !onboardingJustCompleted && !isAnonymousUser);

  useEffect(() => {
    if (isLoading || !shouldRedirectToAuth) {
      return;
    }

    trackEvent("redirect_to_auth", {
      from_path: location.pathname,
      reason: currentUser === null ? "not_authenticated" : "onboarding_incomplete",
    });
  }, [currentUser, isLoading, location.pathname, shouldRedirectToAuth]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (shouldRedirectToAuth) {
    return <Navigate to="/auth" replace />;
  }

  // Transform data for Base44 format
  const missions = (activeGoals || []).map(goal => ({
    id: goal._id,
    name: goal.title,
    category: goal.category.toLowerCase().replace(' ', '_'),
    description: goal.description,
    percent_complete: goal.progress || 0,
    priority: goal.priority,
    deadline: goal.targetDate,
    status: goal.status,
    xp_value: 100
  }));

  const allTasksFormatted = (allTasks || []).map(task => ({
    id: task._id,
    mission_id: task.goalId,
    milestone_id: task.milestoneId,
    title: task.title,
    description: task.description || '',
    is_completed: task.completed,
    completed: task.completed,
    due_date: task.scheduledDate,
    scheduledDate: task.scheduledDate,
    scheduled_time: task.scheduledTime,
    duration_minutes: task.durationMinutes || 45, // Use actual duration from DB
    priority: 'medium',
    xp_value: 10
  }));

  // Helper function to calculate rank from XP
  const getRankFromXP = (xp: number) => {
    if (xp < 1000) return 'helper';
    if (xp < 5000) return 'steady';
    if (xp < 15000) return 'anchor';
    return 'care lead';
  };

  const userData = user ? {
    id: user.id,
    name: user.profile?.name || 'Guest',
    email: user.email,
    xp_points: user.profile?.points || 0,
    rank: getRankFromXP(user.profile?.points || 0),
    energy_coins: user.profile?.coins || 0,
    current_streak: Math.max(1, user.profile?.currentStreak || 0), // Minimum 1 day if user is logged in
    longest_streak: user.profile?.longestStreak || 0
  } : null;

  const handleMissionCreated = (goalId?: Id<"goals">) => {
    setShowLaunchModal(false);
    // Show scheduling modal if goal was created
    if (goalId) {
      if (isGuestMode) {
        setGuestUpgradeGoalId(goalId);
        return;
      }
      setSchedulingGoalId(goalId);
      setShowSchedulingModal(true);
    }
    // Data will auto-refresh via Convex hooks
  };

  return (
    <AudioCallProvider>
    <div className="h-screen bg-[var(--bg-space-900)] text-[var(--star)] relative overflow-hidden flex flex-col">
      {/* Ambient particle shimmer overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        {ambientParticles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: particle.left,
              top: particle.top,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay
            }}
          />
        ))}
      </div>

      <TopHUD 
        user={userData}
        onLaunchClick={() => setShowLaunchModal(true)}
      />

      {/* Tutorial Notification Banner */}
      <AnimatePresence>
        {showTutorialNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-40"
          >
            <div className="bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-cyan)] px-6 py-3 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-white" />
                <p className="text-white font-medium">
                  Tutorial in progress! Click <span className="font-bold">Day Map</span> to continue learning DayBridge.
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Tutorial
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex flex-1 relative overflow-hidden">
        <LeftNavigation 
          activeNav={activeNav}
          setActiveNav={setActiveNav}
          missions={missions}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
        
        <main className="flex-1 px-4 md:px-6 py-6 relative min-w-0 overflow-y-auto overflow-x-hidden">
          <Outlet context={{ 
            setSelectedGoalId, 
            missions, 
            tasks: allTasksFormatted, 
            user: userData, 
            onLaunchClick: () => setShowLaunchModal(true),
            setShowLaunchModal,
            selectedCategory,
            setSelectedCategory
          }} />
        </main>
      </div>

      <ArcNavigator tasks={allTasksFormatted} userId={currentUser?.id} />

      {showLaunchModal && (
        <LaunchMissionModal
          onClose={() => setShowLaunchModal(false)}
          onSuccess={handleMissionCreated}
        />
      )}

      {selectedGoalId && (
        <GoalDrawer
          goalId={selectedGoalId}
          isOpen={true}
          onClose={() => setSelectedGoalId(null)}
        />
      )}

      {showSchedulingModal && schedulingGoalId && (
        <SchedulingModal
          goalId={schedulingGoalId}
          onClose={() => {
            setShowSchedulingModal(false);
            setSchedulingGoalId(null);
          }}
        />
      )}

      <AnimatePresence>
        {guestUpgradeGoalId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06111d]/82 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="w-full max-w-lg rounded-[24px] border border-[#35547c] bg-[#091626] p-7 shadow-[0_30px_100px_rgba(2,8,18,0.65)]"
            >
              <p className="text-sm font-medium text-blue-100/72">
                Your first care plan is live
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white">
                Create an account to keep this plan and continue.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                You can keep exploring for now, but a real account is what turns this guest session into a saved DayBridge workspace.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(`/auth?upgrade=guest&goalId=${guestUpgradeGoalId}`)}
                  className="inline-flex items-center justify-center rounded-[16px] border border-[#6b9fff] bg-[#4f86f7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6394ff]"
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => setGuestUpgradeGoalId(null)}
                  className="rounded-[16px] border border-[#29476f] bg-[#0d1c31] px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-[#13223a]"
                >
                  Keep exploring
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
    </AudioCallProvider>
  );
}
