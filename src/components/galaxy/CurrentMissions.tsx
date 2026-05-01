import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoalsService, MilestonesService, TasksService } from '../../services';
import { ChevronDown, ChevronRight, Circle, CheckCircle2, Target, Calendar, Zap, Clock, MoreVertical, Trash2, Eye } from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';
import { DeleteMissionModal } from './DeleteMissionModal';
import { useToast } from '@/hooks/useToast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function CurrentMissions({ onMissionSelect }) {
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<any>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [optimisticallyDeleted, setOptimisticallyDeleted] = useState<Set<string>>(new Set());
  
  // Data hooks
  const activeGoals = GoalsService.useList('active');
  const toggleTask = TasksService.useToggle();
  const deleteGoal = GoalsService.useDelete();
  const { toast } = useToast();

  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const handleTaskToggle = async (taskId: Id<"tasks">, task?: any) => {
    try {
      const wasCompleted = task?.completed || false;
      
      // Toggle the task
      await toggleTask({ taskId });
      
      // If task was just completed (not uncompleted), show undo toast
      if (!wasCompleted && task) {
        toast({
          title: "Task completed!",
          description: task.title,
          action: (
            <button
              onClick={async () => {
                try {
                  await toggleTask({ taskId });
                  toast({
                    title: "Task restored!",
                    className: "bg-black text-white border-gray-700",
                  });
                } catch (error) {
                  console.error('Failed to undo task completion:', error);
                  toast({
                    title: "Failed to undo task completion",
                    variant: "destructive",
                    className: "bg-black text-white border-gray-700",
                  });
                }
              }}
              className="text-sm bg-white text-black px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              Undo
            </button>
          ),
          className: "bg-black text-white border-gray-700",
        });
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleDeleteClick = (goal: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setGoalToDelete(goal);
    setDeleteModalOpen(true);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async (removeFromTimeline: boolean) => {
    if (!goalToDelete) return;

    try {
      setDeletingGoalId(goalToDelete._id);
      setDeleteError(null);

      // Optimistic update
      setOptimisticallyDeleted(prev => new Set(prev).add(goalToDelete._id));

      // Perform deletion
      await deleteGoal({ goalId: goalToDelete._id });

      // Success toast
      toast({
        title: "Care plan deleted",
        description: `"${goalToDelete.title}" has been removed.`,
        className: "glass-panel border-white/10 bg-gray-900/90",
      });

      // Close modal
      setDeleteModalOpen(false);
      setGoalToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete goal:', error);
      
      // Remove from optimistic delete set on error
      setOptimisticallyDeleted(prev => {
        const newSet = new Set(prev);
        newSet.delete(goalToDelete._id);
        return newSet;
      });

      // Handle 404 as success (already deleted)
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast({
          description: "The care plan has been removed.",
          className: "glass-panel border-white/10 bg-gray-900/90",
        });
        setDeleteModalOpen(false);
        setGoalToDelete(null);
      } else {
        setDeleteError(error.message || 'Failed to delete care plan. Please try again.');
      }
    } finally {
      setDeletingGoalId(null);
    }
  };

  const handleRetryDelete = () => {
    if (goalToDelete) {
      handleDeleteConfirm(true);
    }
  };

  // Filter out optimistically deleted goals
  const visibleGoals = activeGoals?.filter(goal => !optimisticallyDeleted.has(goal._id)) || [];

  if (!activeGoals || visibleGoals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-12 text-center"
      >
        <Target className="mx-auto mb-4 h-14 w-14 text-[var(--accent-cyan)]" />
        <h3 className="text-xl font-semibold text-white mb-2">No Active Care Plans</h3>
        <p className="text-white/60">
          Add the first routine, appointment, or support plan to begin.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Care Plans</h2>
        <p className="text-white/60">
          Track active routines, checkpoints, and tasks.
        </p>
      </motion.div>

      <div className="space-y-4">
        {visibleGoals.map((goal, index) => (
          <MissionCard
            key={goal._id}
            goal={goal}
            isExpanded={expandedGoals.has(goal._id)}
            onToggle={() => toggleGoal(goal._id)}
            onTaskToggle={handleTaskToggle}
            onViewDetails={() => onMissionSelect?.(goal._id)}
            onDeleteClick={(e) => handleDeleteClick(goal, e)}
            isDeleting={deletingGoalId === goal._id}
            index={index}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {goalToDelete && (
        <DeleteMissionModal
          isOpen={deleteModalOpen}
          onClose={() => {
            if (!deletingGoalId) {
              setDeleteModalOpen(false);
              setGoalToDelete(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleDeleteConfirm}
          missionTitle={goalToDelete.title}
          isDeleting={!!deletingGoalId}
          error={deleteError}
        />
      )}
    </div>
  );
}

interface MissionCardProps {
  goal: any;
  isExpanded: boolean;
  onToggle: () => void;
  onTaskToggle: (taskId: Id<"tasks">, task?: any) => void;
  onViewDetails?: () => void;
  onDeleteClick?: (e: React.MouseEvent) => void;
  isDeleting?: boolean;
  index: number;
}

function MissionCard({ goal, isExpanded, onToggle, onTaskToggle, onViewDetails, onDeleteClick, isDeleting = false, index }: MissionCardProps) {
  const milestones = MilestonesService.useGetForGoal(goal._id);
  const tasks = TasksService.useGetForGoal(goal._id);

  const pendingTasks = tasks?.filter(t => !t.completed) || [];
  const completedTasks = tasks?.filter(t => t.completed) || [];
  const upcomingTasks = pendingTasks.slice(0, 3);

  const getCategoryColor = (category: string) => {
    const colors = {
      'Academic': 'from-blue-500 to-blue-600',
      'Career': 'from-purple-500 to-purple-600',
      'Creative': 'from-pink-500 to-pink-600',
      'Entrepreneurial': 'from-orange-500 to-orange-600',
      'Personal Growth': 'from-green-500 to-green-600',
    };
    return colors[category] || 'from-gray-500 to-gray-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-panel rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all ${
        isDeleting ? 'opacity-50 pointer-events-none' : ''
      }`}
    >
      {/* Header */}
      <div
        className="p-6 cursor-pointer relative"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Kebab Menu - Collapsed State */}
          {!isExpanded && (
            <div className="absolute top-6 right-12 z-10" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                    aria-label="Care plan options"
                    disabled={isDeleting}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end"
                  className="glass-panel border-white/10 bg-gray-900/95"
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails?.();
                    }}
                    className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onClick={onDeleteClick}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete care plan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <div className="flex items-start gap-3 flex-1 pr-8">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getCategoryColor(goal.category)} flex items-center justify-center flex-shrink-0`}>
              <Target className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-1 truncate">
                {goal.title}
              </h3>
              
              <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  {goal.category}
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {goal.priority}
                </div>
                {goal.targetDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {(() => {
                      // Parse YYYY-MM-DD without timezone conversion
                      const [year, month, day] = goal.targetDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('en-US');
                    })()}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress || 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full bg-gradient-to-r ${getCategoryColor(goal.category)}`}
                />
              </div>
              <div className="text-xs text-white/60 mt-1">
                {goal.progress || 0}% complete
              </div>
            </div>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/60 mt-1"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-0 space-y-4 border-t border-white/10">
              
              {/* Expanded Header with Delete Button */}
              <div className="flex items-center justify-between pt-4">
                <h4 className="text-sm font-semibold text-white/60">Care Plan Details</h4>
                <button
                  onClick={onDeleteClick}
                  disabled={isDeleting}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-red-900/10"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete care plan
                </button>
              </div>
              
              {/* Description */}
              {goal.description && (
                <div className="pt-4">
                  <p className="text-sm text-white/70 leading-relaxed">
                    {goal.description}
                  </p>
                </div>
              )}

              {/* Milestones */}
              {milestones && milestones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Checkpoints ({milestones.length})
                  </h4>
                  <div className="space-y-2">
                    {milestones.slice(0, 3).map((milestone, idx) => (
                      <div
                        key={milestone._id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          milestone.status === 'completed'
                            ? 'bg-green-900/10 border border-green-700/20'
                            : 'bg-white/5'
                        }`}
                      >
                        {milestone.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">
                            {milestone.title}
                          </div>
                          {milestone.deadline && (
                            <div className="text-xs text-white/50 mt-1 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due: {(() => {
                                const [year, month, day] = milestone.deadline.split('-').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString('en-US');
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {milestones.length > 3 && (
                      <div className="text-xs text-white/50 text-center">
                        +{milestones.length - 3} more checkpoints
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upcoming Tasks */}
              {upcomingTasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Next Tasks ({pendingTasks.length} pending)
                  </h4>
                  <div className="space-y-2">
                    {upcomingTasks.map((task) => (
                      <div
                        key={task._id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskToggle(task._id, task);
                          }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                          <Circle className="w-4 h-4 text-white/40" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">
                            {task.title}
                          </div>
                          {task.scheduledDate && (
                            <div className="text-xs text-white/50 mt-1">
                              {(() => {
                                const [year, month, day] = task.scheduledDate.split('-').map(Number);
                                return new Date(year, month - 1, day).toLocaleDateString('en-US');
                              })()}
                              {task.scheduledTime && ` at ${task.scheduledTime}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[var(--accent-cyan)]">
                    {milestones?.length || 0}
                  </div>
                  <div className="text-xs text-white/50">Checkpoints</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {completedTasks.length}
                  </div>
                  <div className="text-xs text-white/50">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {pendingTasks.length}
                  </div>
                  <div className="text-xs text-white/50">Pending</div>
                </div>
              </div>

              {onViewDetails && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails();
                  }}
                  className="w-full py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  View Full Details →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
