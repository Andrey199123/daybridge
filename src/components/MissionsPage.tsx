import React from 'react';
import { motion } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { CurrentMissions } from './galaxy/CurrentMissions';
import { GoalsService } from '../services';
import { Button } from './ui/button';
import { ClipboardPlus, Target, ListChecks, CalendarCheck, HeartHandshake } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface OutletContext {
  setSelectedGoalId: (id: Id<"goals"> | null) => void;
  missions: any[];
  selectedCategory: string | null;
  setShowLaunchModal: (show: boolean) => void;
}

export function MissionsPage() {
  const { setSelectedGoalId, missions, selectedCategory, setShowLaunchModal } = useOutletContext<OutletContext>();
  const navigate = useNavigate();
  const activeGoals = GoalsService.useList('active');

  const handleGoalSelect = (goalId: Id<"goals">) => {
    setSelectedGoalId(goalId);
  };

  // Filter missions by selected category
  const filteredMissions = selectedCategory 
    ? missions.filter(m => m.category === selectedCategory)
    : missions;

  const activeMissions = filteredMissions.filter(m => m.status === 'active');

  if (activeMissions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        <div className="glass-panel rounded-2xl p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center"
          >
            <Target className="w-12 h-12 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-4">
            Care Plans
          </h2>
          
          <p className="text-lg text-white/70 mb-8 max-w-md mx-auto">
            No care plans yet. Add the first routine, appointment, or support plan to make the day easier to follow.
          </p>
          
          <Button
            onClick={() => setShowLaunchModal(true)}
            className="arc-primary-gradient text-white font-semibold border-0 px-6"
          >
            <ClipboardPlus className="w-4 h-4 mr-2" />
            Add Care Plan
          </Button>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              What are care plans?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="glass-panel rounded-lg p-4">
                <ListChecks className="h-7 w-7 mb-2 text-[var(--accent-cyan)]" />
                <h4 className="text-sm font-semibold text-white mb-1">Name the Need</h4>
                <p className="text-xs text-white/60">Describe the routine or support moment</p>
              </div>
              <div className="glass-panel rounded-lg p-4">
                <CalendarCheck className="h-7 w-7 mb-2 text-[var(--accent-cyan)]" />
                <h4 className="text-sm font-semibold text-white mb-1">Break Down Steps</h4>
                <p className="text-xs text-white/60">Turn it into clear daily actions</p>
              </div>
              <div className="glass-panel rounded-lg p-4">
                <HeartHandshake className="h-7 w-7 mb-2 text-[var(--accent-cyan)]" />
                <h4 className="text-sm font-semibold text-white mb-1">Share Signals</h4>
                <p className="text-xs text-white/60">Let helpers know what needs attention</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <CurrentMissions onMissionSelect={handleGoalSelect} />
    </motion.div>
  );
}
