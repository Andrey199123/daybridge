import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Id, GoalsService, MilestonesService, TasksService } from '../../services';
import { X, CheckCircle, Circle, Calendar, Target, Zap, Clock, Undo2, CalendarClock, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SchedulingModal } from '../SchedulingModal';
import { matchesMediaQuery } from '../../lib/browser';

interface GoalDrawerProps {
  goalId: Id<"goals">;
  isOpen: boolean;
  onClose: () => void;
}

export function GoalDrawer({ goalId, isOpen, onClose }: GoalDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'tasks'>('overview');
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [generatingTasksFor, setGeneratingTasksFor] = useState<Id<"milestones"> | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Data hooks
  const goal = GoalsService.useGetWithMilestones(goalId);
  const milestones = MilestonesService.useGetForGoal(goalId);
  const tasks = TasksService.useGetForGoal(goalId);

  // Mutations
  const updateTask = TasksService.useUpdate();
  const toggleTask = TasksService.useToggle();
  const generateTasks = MilestonesService.useGenerateTasks();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if scheduling modal is open (it renders via portal)
      if (showSchedulingModal) return;
      
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, showSchedulingModal]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle reduced motion
  const prefersReducedMotion = matchesMediaQuery('(prefers-reduced-motion: reduce)');

  if (!goal) {
    return null;
  }

  const handleTaskToggle = async (taskId: Id<"tasks">) => {
    try {
      // Find the task to check if it's being completed or uncompleted
      const task = tasks?.find(t => t._id === taskId);
      if (!task) return;
      
      const wasCompleted = task.completed;
      
      // Toggle the task
      await toggleTask({ taskId });
      
      // If task was just completed (not uncompleted), show undo toast
      if (!wasCompleted) {
        toast.success("Task completed!", {
          description: task.title,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await toggleTask({ taskId });
                toast.success("Task restored!");
              } catch (error) {
                console.error('Failed to undo task completion:', error);
                toast.error("Failed to undo task completion");
              }
            },
          },
          duration: 5000, // Show for 5 seconds
        });
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      toast.error("Failed to update task", {
        style: {
          background: '#000000',
          color: '#ffffff',
          border: '1px solid #333333',
        },
      });
    }
  };

  const completedTasks = tasks?.filter(task => task.completed) || [];
  const pendingTasks = tasks?.filter(task => !task.completed) || [];
  const completedMilestones = milestones?.filter(milestone => milestone.status === 'completed') || [];
  const pendingMilestones = milestones?.filter(milestone => milestone.status === 'active') || [];

  const handleGenerateTasks = async (milestoneId: Id<"milestones">) => {
    setGeneratingTasksFor(milestoneId);
    try {
      await generateTasks({ milestoneId });
      toast.success("Tasks generated successfully!", {
        description: "New tasks have been created for this checkpoint.",
      });
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      toast.error("Failed to generate tasks", {
        description: "Please try again later.",
      });
    } finally {
      setGeneratingTasksFor(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`absolute right-0 top-0 h-full w-96 bg-gray-900 border-l border-gray-700 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white truncate pr-4">
              {goal.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {goal.category}
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              {goal.priority}
            </div>
            {goal.targetDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {(() => {
                  // Parse YYYY-MM-DD without timezone conversion
                  const [year, month, day] = goal.targetDate.split('-').map(Number);
                  return new Date(year, month - 1, day).toLocaleDateString('en-US');
                })()}
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{goal.progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>

          {/* View Full Details Button */}
          <button
            onClick={() => {
              onClose();
              navigate(`/goal/${goalId}`);
            }}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Details
          </button>

          {/* Adjust Schedule Button */}
          {pendingTasks.length > 0 && (
            <button
              onClick={() => setShowSchedulingModal(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:from-blue-500/30 hover:to-purple-500/30 transition-all"
            >
              <CalendarClock className="w-4 h-4" />
              Adjust Schedule ({pendingTasks.length} tasks)
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 flex-shrink-0">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'milestones', label: 'Checkpoints', icon: Calendar },
            { id: 'tasks', label: 'Tasks', icon: CheckCircle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <p className="text-gray-300 leading-relaxed">{goal.description}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {completedTasks.length}
                  </div>
                  <div className="text-sm text-gray-400">Tasks Done</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {completedMilestones.length}
                  </div>
                  <div className="text-sm text-gray-400">Checkpoints</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {completedTasks.slice(0, 3).map((task) => (
                    <div key={task._id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        <div className="text-xs text-gray-400">
                          Completed {task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US') : 'recently'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {completedTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Target className="mx-auto mb-2 h-10 w-10 text-gray-500" />
                      <div>No completed tasks yet</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-4">
              {milestones?.map((milestone, index) => {
                const isPreviousMilestoneCompleted = index === 0 || (milestones[index - 1]?.tasksGenerated ?? false);
                const canGenerateTasks = !milestone.tasksGenerated && isPreviousMilestoneCompleted;
                const isGenerating = generatingTasksFor === milestone._id;
                
                return (
                <div
                  key={milestone._id}
                  className={`p-4 rounded-lg border ${
                    milestone.status === 'completed'
                      ? 'bg-green-900 bg-opacity-20 border-green-700'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{milestone.title}</h4>
                    <div className="flex items-center gap-2">
                      {milestone.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  {milestone.deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Clock className="w-4 h-4" />
                      Due: {(() => {
                        // Parse YYYY-MM-DD without timezone conversion
                        const [year, month, day] = milestone.deadline.split('-').map(Number);
                        return new Date(year, month - 1, day).toLocaleDateString('en-US');
                      })()}
                    </div>
                  )}
                  
                  {milestone.skills && milestone.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {milestone.skills.map((skill, skillIndex) => (
                        <span
                          key={skillIndex}
                          className="px-2 py-1 bg-blue-900 bg-opacity-30 text-blue-300 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Generate Tasks Button */}
                  {canGenerateTasks && (
                    <button
                      onClick={() => handleGenerateTasks(milestone._id)}
                      disabled={isGenerating}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating Tasks...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Tasks
                        </>
                      )}
                    </button>
                  )}

                  {milestone.tasksGenerated && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Tasks generated
                    </div>
                  )}

                  {!canGenerateTasks && !milestone.tasksGenerated && (
                    <div className="mt-2 text-sm text-gray-500 italic">
                      Complete previous checkpoint's tasks first
                    </div>
                  )}
                </div>
              )})}

              {(!milestones || milestones.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <Target className="mx-auto mb-2 h-10 w-10 text-gray-500" />
                  <div>No checkpoints yet</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Pending Tasks</h3>
                  <div className="space-y-2">
                    {pendingTasks.map((task) => (
                      <div
                        key={task._id}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <button
                          onClick={() => handleTaskToggle(task._id)}
                          className="p-1 hover:bg-gray-600 rounded transition-colors"
                        >
                          <Circle className="w-4 h-4 text-gray-400" />
                        </button>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-gray-400 mt-1">{task.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Completed Tasks</h3>
                  <div className="space-y-2">
                    {completedTasks.map((task) => (
                      <div
                        key={task._id}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg opacity-75"
                      >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white line-through">{task.title}</div>
                          {task.description && (
                            <div className="text-xs text-gray-400 mt-1">{task.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!tasks || tasks.length === 0) && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📝</div>
                  <div>No tasks yet</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scheduling Modal */}
      {showSchedulingModal && (
        <SchedulingModal
          goalId={goalId}
          onClose={() => setShowSchedulingModal(false)}
          isRescheduling={true}
        />
      )}
    </div>
  );
}
