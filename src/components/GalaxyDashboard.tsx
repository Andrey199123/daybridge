import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useOutletContext } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { GoalsService, UserMetaService, TasksService, MilestonesService } from '../services';
import { GalaxyMap } from './galaxy/GalaxyMap';
import { RightRail } from './galaxy/RightRail';
import { MiniTimeline } from './galaxy/MiniTimeline';
import { CurrentMissions } from './galaxy/CurrentMissions';
import { TutorialOverlay } from './TutorialOverlay';
import { DailyQuote } from './DailyQuote';
import { Id } from '../../convex/_generated/dataModel';
import { trackEvent } from '../lib/analytics';
import {
  FORCE_TUTORIAL_REPLAY_KEY,
  GUEST_MODE_KEY,
  readSessionStorage,
  removeSessionStorage,
} from '../lib/browser';

interface OutletContext {
  setSelectedGoalId: (id: Id<"goals"> | null) => void;
  missions: any[];
  tasks: any[];
  user: any;
  onLaunchClick: () => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

export function GalaxyDashboard() {
  const { setSelectedGoalId, missions, tasks, user, onLaunchClick, selectedCategory } = useOutletContext<OutletContext>();
  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const location = useLocation();
  
  // Data hooks
  const activeGoals = GoalsService.useList('active');
  const galaxyData = useQuery(api.skillsTracker.getGalaxyData);
  
  // Query the full user object directly (not the transformed one from context)
  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    const shouldForceReplay = readSessionStorage(FORCE_TUTORIAL_REPLAY_KEY) === 'true';
    const isGuestMode = readSessionStorage(GUEST_MODE_KEY) === 'true';
    const canShowTutorial =
      !!currentUser &&
      (currentUser.profile?.completedOnboarding || isGuestMode);

    if (canShowTutorial && (shouldForceReplay || !currentUser?.profile?.completedTutorial)) {
      const tutorialPaused = readSessionStorage('tutorialPaused');
      
      if (tutorialPaused === 'true') {
        removeSessionStorage('tutorialPaused');
      }

       if (shouldForceReplay) {
        removeSessionStorage(FORCE_TUTORIAL_REPLAY_KEY);
      }
      
      setShowTutorial(true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (location.pathname === "/dashboard") {
      trackEvent("dashboard_arrival", { path: location.pathname });
    }
  }, [location.pathname]);

  useEffect(() => {
    setIsLoading(false);
  }, [activeGoals]);

  const handleMissionSelect = (mission: any) => {
    // Mission.id is actually the Convex goal ID
    setSelectedGoalId(mission.id as Id<"goals">);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
  };

  // Filter missions by selected category
  const filteredMissions = selectedCategory 
    ? missions.filter(m => m.category === selectedCategory)
    : missions;

  const activeMissions = filteredMissions.filter(m => m.status === 'active');
  const todayTasks = tasks.filter(t => !t.is_completed && t.due_date === new Date().toISOString().split('T')[0]);

  return (
    <>
      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
        />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-full p-4"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 md:gap-6 mb-4 md:mb-6 max-w-full">
          <div className="galaxy-map-container">
            <GalaxyMap 
              missions={activeMissions}
              milestones={milestones}
              onMissionSelect={handleMissionSelect}
              isLoading={isLoading}
              userName={user?.name || 'Guest'}
              galaxyData={galaxyData}
            />
          </div>
          
          <RightRail 
            missions={activeMissions}
            tasks={todayTasks}
            user={user}
            onLaunchClick={onLaunchClick}
          />
        </div>
        
        <div className="max-w-full">
          <MiniTimeline />
        </div>
      </motion.div>
    </>
  );
}
