import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Download, Target, CheckSquare, Flag, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarExportModal({ isOpen, onClose }: CalendarExportModalProps) {
  const [includeGoals, setIncludeGoals] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeMilestones, setIncludeMilestones] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const preview = useQuery(api.calendar.getCalendarPreview);
  const generateIcs = useAction(api.calendar.generateIcsFile);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const icsContent = await generateIcs({
        includeGoals,
        includeTasks,
        includeMilestones,
      });

      // Create blob and download
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `arc-calendar-${new Date().toISOString().split('T')[0]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Calendar exported! Open the .ics file to add to your calendar.");
      onClose();
    } catch (error) {
      toast.error("Failed to export calendar");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalEvents = 
    (includeGoals ? (preview?.goals || 0) : 0) +
    (includeTasks ? (preview?.tasks || 0) : 0) +
    (includeMilestones ? (preview?.milestones || 0) : 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-start justify-center pt-24 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[var(--card-bg)] border border-white/10 rounded-xl p-6 w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[var(--accent-cyan)]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Export Calendar</h2>
                <p className="text-sm text-white/50">Download as .ics file</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          <div className="space-y-3 mb-6">
            <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-[var(--accent-cyan)]" />
                <div>
                  <p className="text-white font-medium">Goals</p>
                  <p className="text-xs text-white/50">{preview?.goals || 0} with target dates</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeGoals}
                onChange={(e) => setIncludeGoals(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-[var(--accent-cyan)]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-[var(--accent-violet)]" />
                <div>
                  <p className="text-white font-medium">Tasks</p>
                  <p className="text-xs text-white/50">{preview?.tasks || 0} scheduled</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeTasks}
                onChange={(e) => setIncludeTasks(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-[var(--accent-violet)]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <Flag className="w-5 h-5 text-[var(--warning)]" />
                <div>
                  <p className="text-white font-medium">Milestones</p>
                  <p className="text-xs text-white/50">{preview?.milestones || 0} with deadlines</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeMilestones}
                onChange={(e) => setIncludeMilestones(e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-[var(--warning)]"
              />
            </label>
          </div>

          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-sm text-white/70">
              <span className="text-white font-medium">{totalEvents}</span> events will be exported
            </p>
            <p className="text-xs text-white/50 mt-1">
              The .ics file works with Apple Calendar, Google Calendar, Outlook, and more.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || totalEvents === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/80 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
