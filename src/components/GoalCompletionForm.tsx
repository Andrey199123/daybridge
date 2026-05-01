import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Trophy, X } from 'lucide-react';
import { toast } from 'sonner';

interface GoalCompletionFormProps {
  goalId: Id<"goals">;
  goalTitle: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function GoalCompletionForm({ goalId, goalTitle, onComplete, onSkip }: GoalCompletionFormProps) {
  const [formData, setFormData] = useState({
    result: '',
    feedback: '',
    whatWentWell: '',
    whatCouldImprove: '',
    skillsGained: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const updateGoalCompletion = useMutation(api.goals.updateGoalCompletionDetails);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await updateGoalCompletion({
        goalId,
        completionDetails: {
          result: formData.result || undefined,
          feedback: formData.feedback || undefined,
          whatWentWell: formData.whatWentWell || undefined,
          whatCouldImprove: formData.whatCouldImprove || undefined,
          skillsGained: formData.skillsGained ? formData.skillsGained.split(',').map(s => s.trim()) : undefined,
        },
      });
      toast.success('Completion details saved!');
      onComplete();
    } catch (error) {
      console.error('Failed to save completion details:', error);
      toast.error('Failed to save details');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Form */}
      <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-white/10 rounded-2xl p-6 max-w-2xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Care Plan Completed</h2>
              <p className="text-white/60 text-sm">Tell us what worked today.</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Skip"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Goal Title */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
          <p className="text-lg font-semibold text-white text-center">
            "{goalTitle}"
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Result */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Final Result <span className="text-white/40">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.result}
              onChange={(e) => setFormData(prev => ({ ...prev, result: e.target.value }))}
              placeholder="e.g., 1st place, 95%, Accepted, Completed"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
            />
          </div>

          {/* What Went Well */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              What went well? <span className="text-white/40">(optional)</span>
            </label>
            <textarea
              value={formData.whatWentWell}
              onChange={(e) => setFormData(prev => ({ ...prev, whatWentWell: e.target.value }))}
              placeholder="Describe what you did well and what contributed to your success..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all resize-none"
            />
          </div>

          {/* What Could Improve */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              What could you improve? <span className="text-white/40">(optional)</span>
            </label>
            <textarea
              value={formData.whatCouldImprove}
              onChange={(e) => setFormData(prev => ({ ...prev, whatCouldImprove: e.target.value }))}
              placeholder="Reflect on areas for growth and lessons learned..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Skills Gained */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Skills Gained <span className="text-white/40">(optional, comma-separated)</span>
            </label>
            <input
              type="text"
              value={formData.skillsGained}
              onChange={(e) => setFormData(prev => ({ ...prev, skillsGained: e.target.value }))}
              placeholder="e.g., Public Speaking, Python, Time Management"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
            />
          </div>

          {/* Overall Feedback */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Additional Notes <span className="text-white/40">(optional)</span>
            </label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
              placeholder="Any other notes or reflections on this care plan..."
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
