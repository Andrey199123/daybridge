import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ClipboardPlus, HeartHandshake } from "lucide-react";
import { GoalsService, MilestonesService, TasksService } from "../../services";
import { CheckInPrompt } from "../GoalCheckIn";
import { DailyQuote } from "../DailyQuote";

export function RightRail({ missions, tasks, user, onLaunchClick }) {
  // Fetch all data for progress calculations
  const allTasks = TasksService.useGetAll();
  const allMilestones = MilestonesService.useGetAll();
  const activeGoals = GoalsService.useList('active');
  const completedGoals = GoalsService.useList('completed');

  const progressStats = useMemo(() => {
    // All Goals: overall goal completion rate
    const allGoals = [...(activeGoals || []), ...(completedGoals || [])];
    const totalGoals = allGoals.length;
    const goalsCompleted = completedGoals?.length || 0;
    const goalsProgress = totalGoals > 0 
      ? (goalsCompleted / totalGoals) * 100 
      : 0;

    // All Milestones: overall milestone completion rate
    const totalMilestones = allMilestones?.length || 0;
    const milestonesCompleted = allMilestones?.filter(m => m.status === 'completed').length || 0;
    const milestonesProgress = totalMilestones > 0 
      ? (milestonesCompleted / totalMilestones) * 100 
      : 0;

    // All Tasks: overall task completion rate
    const totalTasks = allTasks?.length || 0;
    const tasksCompleted = allTasks?.filter(t => t.completed).length || 0;
    const tasksProgress = totalTasks > 0 
      ? (tasksCompleted / totalTasks) * 100 
      : 0;

    // Overall Progress: weighted average (goals 50%, milestones 30%, tasks 20%)
    const overallProgress = totalGoals > 0 || totalMilestones > 0 || totalTasks > 0
      ? (goalsProgress * 0.5) + (milestonesProgress * 0.3) + (tasksProgress * 0.2)
      : 0;

    return {
      goalsProgress,
      milestonesProgress,
      tasksProgress,
      overallProgress,
    };
  }, [allTasks, allMilestones, activeGoals, completedGoals]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* Check-In Prompt */}
      <CheckInPrompt />

      {/* Care Plan Progress - Expanded */}
      <div className="glass-panel rounded-2xl p-6" data-tutorial="mission-progress">
        <h3 className="font-semibold mb-4">Care Plan Progress</h3>
        <div className="space-y-4">
          <div data-tutorial="goals-progress">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Plans Completed</span>
              <span className="text-[var(--accent-cyan)] font-medium">{Math.round(progressStats.goalsProgress)}%</span>
            </div>
            <Progress value={progressStats.goalsProgress} className="h-2 bg-white/10" />
          </div>

          <div data-tutorial="milestones-progress">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Milestones Completed</span>
              <span className="text-[var(--accent-violet)] font-medium">{Math.round(progressStats.milestonesProgress)}%</span>
            </div>
            <Progress value={progressStats.milestonesProgress} className="h-2 bg-white/10" />
          </div>

          <div data-tutorial="tasks-progress">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Tasks Completed</span>
              <span className="text-[var(--success)] font-medium">{Math.round(progressStats.tasksProgress)}%</span>
            </div>
            <Progress value={progressStats.tasksProgress} className="h-2 bg-white/10" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Overall Progress</span>
              <span className="text-[var(--warning)] font-medium">{Math.round(progressStats.overallProgress)}%</span>
            </div>
            <Progress value={progressStats.overallProgress} className="h-2 bg-white/10" />
          </div>
        </div>
      </div>

      {/* Care Plan Center */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Care Plan Center</h3>
          <p className="text-sm text-white/60 mb-4">Ready to add the next routine, visit, or support plan?</p>
          <Button
            onClick={onLaunchClick}
            className="arc-primary-gradient text-white font-semibold w-full border-0"
            data-tutorial="launch-button"
          >
            <ClipboardPlus className="w-4 h-4 mr-2" />
            Add Care Plan
          </Button>
        </div>
      </div>

      {/* Daily Quote - Engraved style */}
      <DailyQuote />
    </motion.div>
  );
}
