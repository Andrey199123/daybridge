import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Calendar, CheckCircle2, Circle, Clock } from 'lucide-react';
import { TimelineMilestone, TimelineMission } from './useTimelineData';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface MilestoneDetailModalProps {
  milestone: TimelineMilestone;
  missions: TimelineMission[];
  onClose: () => void;
}

export function MilestoneDetailModal({ milestone, missions, onClose }: MilestoneDetailModalProps) {
  const mission = missions.find(m => m.id === milestone.mission_id);
  
  // Fetch tasks for this milestone
  const tasks = useQuery(api.tasks.getTasksForMilestone, { 
    milestoneId: milestone.id as Id<"milestones"> 
  });

  const completedTasks = tasks?.filter(t => t.completed) || [];
  const pendingTasks = tasks?.filter(t => !t.completed) || [];
  const progress = tasks && tasks.length > 0 
    ? Math.round((completedTasks.length / tasks.length) * 100) 
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="glass-panel rounded-2xl border border-white/20 w-full max-w-lg max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-purple-500/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{milestone.title}</h2>
                  {mission && (
                    <Link 
                      to={`/goal/${mission.id}`}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {mission.name}
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Deadline & Progress */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-panel rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Deadline</span>
                </div>
                <div className="text-lg font-semibold text-white">
                  {milestone.deadline 
                    ? format(new Date(milestone.deadline), 'MMM d, yyyy')
                    : 'No deadline set'
                  }
                </div>
              </div>
              <div className="glass-panel rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Progress</span>
                </div>
                <div className="text-lg font-semibold text-white">
                  {progress}%
                </div>
                <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                milestone.status === 'completed' 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-yellow-500/20 border border-yellow-500/30'
              }`}>
                {milestone.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-400" />
                )}
                <span className={`text-sm font-medium ${
                  milestone.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {milestone.status === 'completed' ? 'Completed' : 'In Progress'}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                Tasks ({tasks?.length || 0})
              </h3>
              
              {tasks === undefined ? (
                <div className="text-center py-4 text-white/40">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-4 text-white/40">No tasks for this milestone</div>
              ) : (
                <div className="space-y-2">
                  {/* Pending tasks first */}
                  {pendingTasks.map(task => (
                    <div
                      key={task._id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <Circle className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        {task.scheduledDate && (
                          <div className="text-xs text-white/50 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.scheduledDate), 'MMM d')}
                            {task.scheduledTime && ` at ${task.scheduledTime}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Completed tasks */}
                  {completedTasks.map(task => (
                    <div
                      key={task._id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-green-900/10 border border-green-700/20"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white/60 line-through">{task.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-white/5">
            {mission && (
              <Link
                to={`/goal/${mission.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-colors"
              >
                View Goal Details
              </Link>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
