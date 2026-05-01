import React from 'react';
import { motion } from 'framer-motion';
import { TimelineTask, TimelineMission } from './useTimelineData';
import { CATEGORY_COLORS } from './timelineUtils';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { TasksService } from '../../services';
import { toast } from 'sonner';

interface TaskCardProps {
  task: TimelineTask;
  mission?: TimelineMission;
  hasConflict?: boolean;
  conflictingTasks?: string[];
  compact?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, mission, hasConflict = false, conflictingTasks = [], compact = false, onClick }: TaskCardProps) {
  const toggleTask = TasksService.useToggle();
  const color = mission ? CATEGORY_COLORS[mission.category] || '#6C63FF' : '#6C63FF';

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const wasCompleted = task.is_completed;
      
      // Toggle the task
      await toggleTask({ taskId: task.id as any });
      
      // If task was just completed (not uncompleted), show undo toast
      if (!wasCompleted) {
        toast.success("Task completed!", {
          description: task.title,
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await toggleTask({ taskId: task.id as any });
                toast.success("Task restored!", {
                  style: {
                    background: '#000000',
                    color: '#ffffff',
                    border: '1px solid #333333',
                  },
                });
              } catch (error) {
                console.error('Failed to undo task completion:', error);
                toast.error("Failed to undo task completion", {
                  style: {
                    background: '#000000',
                    color: '#ffffff',
                    border: '1px solid #333333',
                  },
                });
              }
            },
          },
          duration: 5000,
          style: {
            background: '#000000',
            color: '#ffffff',
            border: '1px solid #333333',
          },
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

  return (
    <motion.div
      className={`glass-panel rounded-lg transition-all h-full cursor-pointer ${
        task.is_completed ? 'opacity-60' : ''
      } ${hasConflict ? 'ring-1 ring-orange-500/50' : ''}`}
      style={{
        border: `2px solid ${color}40`,
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}08`,
        backdropFilter: 'blur(12px)'
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
    >
      <div className={compact ? 'p-2' : 'p-3'}>
        <div className="flex items-start gap-2">
          <button
            onClick={handleToggle}
            className={`flex-shrink-0 ${compact ? 'mt-0' : 'mt-0.5'} hover:scale-110 transition-transform`}
          >
            {task.is_completed ? (
              <CheckCircle2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-green-400`} />
            ) : (
              <Circle className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white/40`} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className={`font-medium text-white ${compact ? 'text-xs' : 'text-sm'} ${
              task.is_completed ? 'line-through opacity-60' : ''
            } truncate`}>
              {task.title}
            </div>

            {!compact && task.description && (
              <div className="text-[10px] text-white/50 mt-1 line-clamp-2">
                {task.description}
              </div>
            )}

            {task.scheduled_time && (
              <div className={`flex items-center gap-1 mt-1 ${compact ? 'text-[9px]' : 'text-[10px]'} text-white/60`}>
                <Clock className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
                {task.scheduled_time}
                {task.duration_minutes && ` (${task.duration_minutes}min)`}
              </div>
            )}

            {mission && !compact && (
              <div
                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium mt-2"
                style={{
                  backgroundColor: `${color}20`,
                  color: color
                }}
              >
                {mission.name}
              </div>
            )}
          </div>

          {hasConflict && (
            <div className="relative group/conflict flex-shrink-0">
              <AlertCircle className="w-3 h-3 text-orange-400" />
              {conflictingTasks.length > 0 && (
                <div className="absolute bottom-full right-0 mb-1 hidden group-hover/conflict:block z-50">
                  <div className="bg-black/90 border border-orange-500/30 rounded-lg p-2 text-xs text-white/90 whitespace-nowrap shadow-lg">
                    <div className="text-orange-400 font-medium mb-1">Conflicts with:</div>
                    {conflictingTasks.map((title, i) => (
                      <div key={i} className="text-white/70 truncate max-w-[200px]">• {title}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

