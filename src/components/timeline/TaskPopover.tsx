import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { TimelineTask, TimelineMission } from './useTimelineData';
import { TaskCard } from './TaskCard';
import { X, Plus } from 'lucide-react';
import { getViewportSize } from '../../lib/browser';

interface TaskPopoverProps {
  date: Date;
  tasks: TimelineTask[];
  missions: TimelineMission[];
  position: { x: number; y: number };
  onClose: () => void;
  onAddTask: () => void;
}

export function TaskPopover({ date, tasks, missions, position, onClose, onAddTask }: TaskPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const viewport = getViewportSize({ width: 1280, height: 720 });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="fixed z-50 w-80 glass-panel rounded-xl border border-white/10 shadow-2xl"
        style={{
          left: Math.min(position.x, viewport.width - 340),
          top: position.y,
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-gray-900/90 backdrop-blur-md z-10">
          <div>
            <div className="font-semibold text-white">
              {format(date, 'EEEE, MMM d')}
            </div>
            <div className="text-xs text-white/60">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Tasks */}
        <div className="p-3 space-y-2">
          {tasks.map(task => {
            const mission = missions.find(m => m.id === task.mission_id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                mission={mission}
              />
            );
          })}

          {/* Add task button */}
          <button
            onClick={onAddTask}
            className="w-full p-3 glass-panel rounded-lg border border-dashed border-white/20 hover:border-[var(--accent-cyan)]/50 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-white/60 hover:text-white"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add task</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
