import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { TimelineMission } from './useTimelineData';
import { X, Calendar, Clock, MessageSquare } from 'lucide-react';
import { TasksService } from '../../services';
import { useToast } from '../../hooks/useToast';

interface QuickAddModalProps {
  date: Date;
  time: string | null;
  missions: TimelineMission[];
  onClose: () => void;
}

export function QuickAddModal({ date, time, missions, onClose }: QuickAddModalProps) {
  const [title, setTitle] = useState('');
  const [selectedMission, setSelectedMission] = useState<string>(missions[0]?.id || '');
  const [selectedTime, setSelectedTime] = useState(time || '09:00');
  const [duration, setDuration] = useState('30');
  const [addingType, setAddingType] = useState<'task' | 'milestone'>('task');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTask = TasksService.useCreate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedMission) return;

    setIsSubmitting(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      await createTask({
        goalId: selectedMission as any,
        title: title.trim(),
        scheduledDate: dateStr,
        scheduledTime: selectedTime,
        order: 0
      });

      toast({
        title: addingType === 'task' ? 'Task created' : 'Milestone created',
        description: `Added to ${format(date, 'MMM d')}`,
        className: 'glass-panel border-white/10 bg-gray-900/90'
      });

      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      toast({
        title: 'Error',
        description: 'Failed to create task. Please try again.',
        className: 'glass-panel border-white/10 bg-red-900/90'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleOpenARC = () => {
    // TODO: Integrate with DayBridge chat
    toast({
      title: 'DayBridge Chat',
      description: 'Coming soon! Chat integration will help refine your task.',
      className: 'glass-panel border-white/10 bg-gray-900/90'
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-panel rounded-2xl border border-white/10 w-full max-w-md shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Quick Add</h2>
              <div className="flex items-center gap-2 text-sm text-white/60 mt-1">
                <Calendar className="w-3 h-3" />
                {format(date, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type selector */}
            <div className="glass-panel rounded-lg p-1 flex gap-1">
              <button
                type="button"
                onClick={() => setAddingType('task')}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                  addingType === 'task'
                    ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Task
              </button>
              <button
                type="button"
                onClick={() => setAddingType('milestone')}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                  addingType === 'milestone'
                    ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Milestone
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Enter ${addingType} title...`}
                className="w-full px-4 py-2 glass-panel rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50"
                autoFocus
                required
              />
            </div>

            {/* Care plan selector */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Care Plan
              </label>
              <select
                value={selectedMission}
                onChange={(e) => setSelectedMission(e.target.value)}
                className="w-full px-4 py-2 glass-panel rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'white'
                }}
                required
              >
                {missions.map(mission => (
                  <option 
                    key={mission.id} 
                    value={mission.id}
                    style={{
                      backgroundColor: '#0D1B3D',
                      color: 'white'
                    }}
                  >
                    {mission.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time and Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 glass-panel rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="15"
                  step="15"
                  className="w-full px-4 py-2 glass-panel rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenARC}
                className="flex-1 px-4 py-2 glass-panel rounded-lg border border-white/10 hover:bg-white/5 text-white/80 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Refine with DayBridge</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !selectedMission}
                className="flex-1 px-4 py-2 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg shadow-[var(--accent-cyan)]/20"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
