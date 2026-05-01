import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { DateInput } from "./DateInput";

interface EditTaskModalProps {
  taskId: Id<"tasks">;
  currentTitle: string;
  currentScheduledDate?: string;
  currentScheduledTime?: string;
  onClose: () => void;
}

export function EditTaskModal({ taskId, currentTitle, currentScheduledDate, currentScheduledTime, onClose }: EditTaskModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [scheduledDate, setScheduledDate] = useState(currentScheduledDate || "");
  const [scheduledTime, setScheduledTime] = useState(currentScheduledTime || "");
  const updateTask = useMutation(api.tasks.updateTask);

  useEffect(() => {
    setTitle(currentTitle);
    setScheduledDate(currentScheduledDate || "");
    setScheduledTime(currentScheduledTime || "");
  }, [taskId, currentTitle, currentScheduledDate, currentScheduledTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title cannot be empty.");
      return;
    }
    try {
      await updateTask({ taskId, title, scheduledDate, scheduledTime });
      toast.success("Task updated!");
      onClose();
    } catch (error) {
      toast.error("Failed to update task.");
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
              Task Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-400 mb-2">
              Scheduled Date
            </label>
            <DateInput
              value={scheduledDate}
              onChange={setScheduledDate}
              placeholder="MM/DD/YYYY"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-400 mb-2">
              Scheduled Time
            </label>
            <input
              id="scheduledTime"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
