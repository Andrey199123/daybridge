import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Pause,
  FastForward,
  SkipForward,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface GoalCheckInProps {
  goalId: Id<"goals">;
  onClose: () => void;
}

export function GoalCheckIn({ goalId, onClose }: GoalCheckInProps) {
  const [showPaceOptions, setShowPaceOptions] = useState(false);
  const [showBufferOptions, setShowBufferOptions] = useState(false);
  const [bufferWeeks, setBufferWeeks] = useState(1);

  const checkInStatus = useQuery(api.adaptiveEngine.getCheckInStatus, { goalId });
  const addBuffer = useMutation(api.adaptiveEngine.addBufferWeeks);
  const adjustPace = useMutation(api.adaptiveEngine.adjustGoalPace);

  if (!checkInStatus) return null;

  const handleAddBuffer = async () => {
    await addBuffer({ goalId, bufferWeeks });
    setShowBufferOptions(false);
  };

  const handleAdjustPace = async (pace: "faster" | "slower") => {
    await adjustPace({ goalId, paceAdjustment: pace });
    setShowPaceOptions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a2e] rounded-2xl max-w-md w-full p-6"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Weekly Check-In</h2>
            <p className="text-white/60 text-sm">
              Week {checkInStatus.weeksSinceCreation} of your journey
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Overview */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Your Progress</span>
            <span className="font-semibold">{checkInStatus.progress}%</span>
          </div>
          <Progress value={checkInStatus.progress} className="h-3 mb-2" />
          
          <div className="flex items-center gap-2 text-sm">
            {checkInStatus.isOnTrack ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-green-400">You're on track!</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400">
                  Slightly behind (expected: {checkInStatus.expectedProgress}%)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">
              {checkInStatus.completedTasks}/{checkInStatus.totalTasks}
            </div>
            <div className="text-xs text-white/50">Tasks Completed</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-2xl font-bold text-violet-400">
              {checkInStatus.completedMilestones}/{checkInStatus.totalMilestones}
            </div>
            <div className="text-xs text-white/50">Milestones Hit</div>
          </div>
        </div>

        {/* Check-in Questions */}
        <div className="space-y-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm mb-3">Still on track with your goal?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Yes, all good!
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setShowPaceOptions(true)}
              >
                <Clock className="w-4 h-4 mr-1" />
                Need to adjust
              </Button>
            </div>
          </div>
        </div>

        {/* Pace Adjustment Options */}
        <AnimatePresence>
          {showPaceOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3">Adjust Your Pace</h3>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleAdjustPace("faster")}
                  >
                    <FastForward className="w-4 h-4 mr-2 text-green-400" />
                    Speed up (move deadlines 1 week earlier)
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleAdjustPace("slower")}
                  >
                    <Pause className="w-4 h-4 mr-2 text-amber-400" />
                    Slow down (extend deadlines by 1 week)
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowPaceOptions(false);
                      setShowBufferOptions(true);
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                    Add buffer weeks
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buffer Options */}
        <AnimatePresence>
          {showBufferOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3">Add Buffer Weeks</h3>
                <p className="text-sm text-white/60 mb-3">
                  This will shift all your milestones and scheduled tasks forward.
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBufferWeeks(Math.max(1, bufferWeeks - 1))}
                  >
                    -
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">
                    {bufferWeeks}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBufferWeeks(Math.min(4, bufferWeeks + 1))}
                  >
                    +
                  </Button>
                  <span className="text-white/60">week{bufferWeeks > 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowBufferOptions(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddBuffer}
                  >
                    Add Buffer
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button variant="ghost" className="w-full" onClick={onClose}>
          Close
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Component to show check-in prompts on dashboard
export function CheckInPrompt() {
  const [selectedGoalId, setSelectedGoalId] = useState<Id<"goals"> | null>(null);
  const goalsNeedingCheckIn = useQuery(api.adaptiveEngine.getGoalsNeedingCheckIn);

  if (!goalsNeedingCheckIn || goalsNeedingCheckIn.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-xl p-4 border border-amber-500/30 bg-amber-500/5"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">Time for a Check-In!</h3>
            <p className="text-sm text-white/60 mb-3">
              {goalsNeedingCheckIn.length} goal{goalsNeedingCheckIn.length > 1 ? "s" : ""} ready for review
            </p>
            <div className="space-y-2">
              {goalsNeedingCheckIn.slice(0, 2).map((goal) => (
                <button
                  key={goal._id}
                  onClick={() => setSelectedGoalId(goal._id)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{goal.title}</span>
                    <Badge className="bg-white/10 text-xs">
                      {goal.progress}%
                    </Badge>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedGoalId && (
          <GoalCheckIn
            goalId={selectedGoalId}
            onClose={() => setSelectedGoalId(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
