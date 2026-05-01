import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Circle, Calendar, Clock, Target, Flag, Edit2, Trash2 } from 'lucide-react';
import { TimelineTask, TimelineMission } from './useTimelineData';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { TasksService } from '../../services';
import { CATEGORY_COLORS } from './timelineUtils';

interface TaskDetailModalProps {
  task: TimelineTask;
  mission?: TimelineMission;
  onClose: () => void;
}

export function TaskDetailModal({ task, mission, onClose }: TaskDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedDate, setEditedDate] = useState(task.due_date || '');
  const [editedTime, setEditedTime] = useState(task.scheduled_time || '');
  const [editedDuration, setEditedDuration] = useState(task.duration_minutes?.toString() || '30');
  
  const toggleTask = TasksService.useToggle();
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteTask = useMutation(api.tasks.deleteTask);
  
  const color = mission ? CATEGORY_COLORS[mission.category] || '#6C63FF' : '#6C63FF';

  const handleToggle = async () => {
    try {
      await toggleTask({ taskId: task.id as Id<"tasks"> });
      toast.success(task.is_completed ? "Task marked incomplete" : "Task completed!");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleSave = async () => {
    try {
      await updateTask({
        taskId: task.id as Id<"tasks">,
        title: editedTitle,
        description: editedDescription,
        scheduledDate: editedDate || undefined,
        scheduledTime: editedTime || undefined,
        durationMinutes: editedDuration ? parseInt(editedDuration) : undefined,
      });
      setIsEditing(false);
      toast.success("Task updated!");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await deleteTask({ taskId: task.id as Id<"tasks"> });
      toast.success("Task deleted");
      onClose();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
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
          <div 
            className="p-6 border-b border-white/10"
            style={{ backgroundColor: `${color}15` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={handleToggle}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                >
                  {task.is_completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  ) : (
                    <Circle className="w-6 h-6" style={{ color }} />
                  )}
                </button>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-white/30"
                      autoFocus
                    />
                  ) : (
                    <h2 className={`text-xl font-bold text-white ${task.is_completed ? 'line-through opacity-60' : ''}`}>
                      {task.title}
                    </h2>
                  )}
                  {mission && (
                    <Link 
                      to={`/goal/${mission.id}`}
                      className="text-sm hover:opacity-80 transition-opacity"
                      style={{ color }}
                    >
                      {mission.name}
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-white/60" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {/* Schedule Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="glass-panel rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Scheduled Date</span>
                </div>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedDate}
                    onChange={(e) => setEditedDate(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                ) : (
                  <div className="text-lg font-semibold text-white">
                    {task.due_date 
                      ? (() => {
                          const [year, month, day] = task.due_date.split('-').map(Number);
                          return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        })()
                      : 'Not scheduled'
                    }
                  </div>
                )}
              </div>
              <div className="glass-panel rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 text-white/60 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Time</span>
                </div>
                {isEditing ? (
                  <input
                    type="time"
                    value={editedTime}
                    onChange={(e) => setEditedTime(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                ) : (
                  <div className="text-lg font-semibold text-white">
                    {task.scheduled_time || 'No time set'}
                    {task.duration_minutes && (
                      <span className="text-sm text-white/60 ml-2">
                        ({task.duration_minutes} min)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Duration (only in edit mode) */}
            {isEditing && (
              <div className="mb-6">
                <div className="glass-panel rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 text-white/60 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Duration (minutes)</span>
                  </div>
                  <input
                    type="number"
                    value={editedDuration}
                    onChange={(e) => setEditedDuration(e.target.value)}
                    min="5"
                    max="480"
                    step="5"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="30"
                  />
                </div>
              </div>
            )}

            {/* Status & Priority */}
            <div className="flex gap-3 mb-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                task.is_completed 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : 'bg-yellow-500/20 border border-yellow-500/30'
              }`}>
                {task.is_completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Clock className="w-4 h-4 text-yellow-400" />
                )}
                <span className={`text-sm font-medium ${
                  task.is_completed ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {task.is_completed ? 'Completed' : 'Pending'}
                </span>
              </div>
              
              {task.priority && (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${
                  task.priority === 'high' 
                    ? 'bg-red-500/20 border border-red-500/30' 
                    : task.priority === 'medium'
                    ? 'bg-orange-500/20 border border-orange-500/30'
                    : 'bg-blue-500/20 border border-blue-500/30'
                }`}>
                  <Flag className={`w-4 h-4 ${
                    task.priority === 'high' ? 'text-red-400' : 
                    task.priority === 'medium' ? 'text-orange-400' : 'text-blue-400'
                  }`} />
                  <span className={`text-sm font-medium capitalize ${
                    task.priority === 'high' ? 'text-red-400' : 
                    task.priority === 'medium' ? 'text-orange-400' : 'text-blue-400'
                  }`}>
                    {task.priority} Priority
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white/80 mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30 min-h-[100px]"
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-white/60 text-sm">
                  {task.description || 'No description'}
                </p>
              )}
            </div>

            {/* Category */}
            {mission && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white/80 mb-2">Category</h3>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium" style={{ color }}>
                    {mission.category}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: color }}
                >
                  Save Changes
                </button>
              </div>
            ) : mission && (
              <Link
                to={`/goal/${mission.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
              >
                <Target className="w-4 h-4" />
                View Goal
              </Link>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
