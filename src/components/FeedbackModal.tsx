import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface FeedbackModalProps {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sendFeedback = useAction(api.feedback.sendFeedback);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sendFeedback({ feedback });
      toast.success("Feedback sent! We'll review it soon.");
      setFeedback("");
      onClose();
    } catch (error) {
      toast.error("Failed to send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start pt-24 z-[9999]">
      <div className="bg-background text-foreground rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-muted-foreground hover:text-foreground font-bold text-lg"
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4">Send Feedback</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="feedback"
              className="block text-sm font-medium mb-1"
            >
              Your Feedback
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-lg"
              rows={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            {submitting ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
